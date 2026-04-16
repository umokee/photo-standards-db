from __future__ import annotations

import logging
import shutil
from datetime import datetime
from pathlib import Path
from uuid import UUID

from app.db import get_sync_session
from app.import_models import import_models
from infra.ml.yolo_trainer import TrainingRunConfig, run_training_sync
from infra.queue.procrastinate import app
from infra.storage.file_storage import resolve_storage_path
from modules.ml_models.models import MlModel
from modules.tasks.models import Task
from modules.tasks.service_sync import (
    get_task_sync,
    is_task_cancelled_sync,
    set_task_progress_sync,
    set_task_state_sync,
)
from sqlalchemy.orm import Session

from .service import (
    build_temp_dataset,
    load_training_data_sync,
    plan_dataset_split,
    validate_training_data,
)

import_models()

logger = logging.getLogger(__name__)


def _reset_model_after_failure(db: Session, model: MlModel) -> None:
    """При неудачном обучении возвращаем модель в "не обучена":
    нет весов, нет метрик, trained_at сброшен. is_active остаётся как был."""
    model.weights_path = None
    model.metrics = None
    model.trained_at = None
    db.commit()


@app.task(queue="training")
def execute_training(*, task_id: str) -> None:
    """
    Выполняет обучение YOLO для одной группы.

    Этапы:
      1. подготовка данных (сбор + валидация + split)
      2. построение dataset на диске
      3. собственно train
      4. сохранение весов и метрик

    При любой ошибке: файл весов удаляется (если успел создаться),
    модель помечается как необученная, задача переводится в failed
    с текстом ошибки. Временные файлы dataset всегда чистятся в finally.
    """
    tid = UUID(task_id)

    with get_sync_session() as db:
        task = get_task_sync(db, tid)
        if not task:
            return
        if task.status == "cancelled":
            return

        if task.entity_type != "ml_model" or not task.entity_id:
            set_task_state_sync(
                db,
                task,
                status="failed",
                stage="Ошибка",
                error="Задача не связана с моделью",
            )
            return

        model = db.get(MlModel, task.entity_id)
        if model is None:
            set_task_state_sync(
                db,
                task,
                status="failed",
                stage="Ошибка",
                error="Модель не найдена",
            )
            return

        try:
            _run_training_job(db, task, model)
        except Exception as exc:
            logger.exception("training task=%s failed", task.id)
            db.rollback()
            _reset_model_after_failure(db, model)
            current = get_task_sync(db, tid)
            if current is not None and current.status != "cancelled":
                set_task_state_sync(
                    db,
                    current,
                    status="failed",
                    stage="Ошибка",
                    message="Обучение прервано из-за ошибки",
                    error=str(exc),
                )


def _run_training_job(db: Session, task: Task, model: MlModel) -> None:
    payload = task.payload or {}

    try:
        base_weights_rel = payload["base_weights_path"]
        epochs = int(payload["epochs"])
        imgsz = int(payload["imgsz"])
        batch_size = int(payload["batch_size"])
        train_ratio = int(payload["train_ratio"])
        val_ratio = int(payload["val_ratio"])
    except (KeyError, ValueError, TypeError) as exc:
        set_task_state_sync(
            db,
            task,
            status="failed",
            stage="Ошибка",
            error=f"Некорректный payload задачи: {exc}",
        )
        return

    base_weights_path = resolve_storage_path(base_weights_rel)
    output_weights_relpath = (
        Path("models") / str(model.group_id) / f"v{model.version}.pt"
    ).as_posix()
    output_weights_abspath = resolve_storage_path(output_weights_relpath)

    dataset_root: Path | None = None

    try:
        # --- 1. Подготовка данных ---

        set_task_state_sync(
            db,
            task,
            status="running",
            stage="Подготовка данных",
            message="Сбор данных для обучения",
        )

        training_data = load_training_data_sync(db, model.group_id)
        validate_training_data(training_data)
        split_plan = plan_dataset_split(
            training_data,
            train_ratio=train_ratio,
            val_ratio=val_ratio,
        )

        if is_task_cancelled_sync(db, task):
            return

        # --- 2. Построение dataset на диске ---

        set_task_state_sync(
            db,
            task,
            status="running",
            stage="Формирование датасета",
            message="Разбиение и подготовка аннотаций",
        )

        dataset_result = build_temp_dataset(training_data, split_plan)
        dataset_root = dataset_result.dataset_root

        # Фиксируем метаданные обучения в модели ДО запуска YOLO,
        # чтобы даже если train упадёт, было видно, на каких данных пробовали.
        model.num_classes = len(training_data.class_keys)
        model.class_keys = training_data.class_keys
        model.class_meta = training_data.class_meta
        model.total_images = split_plan.total
        model.train_count = len(split_plan.train)
        model.val_count = len(split_plan.val)
        model.test_count = len(split_plan.test)
        db.commit()

        if is_task_cancelled_sync(db, task):
            return

        # --- 3. Обучение ---

        def on_status(stage: str) -> None:
            readable_stage = {
                "training": "Обучение",
                "saving": "Сохранение весов",
            }.get(stage, stage)
            set_task_state_sync(
                db,
                task,
                status="running",
                stage=readable_stage,
                message=readable_stage,
            )

        def on_epoch_end(current: int, total: int) -> None:
            set_task_progress_sync(
                db,
                task,
                current=current,
                total=total,
                stage=f"Эпоха {current}/{total}",
            )

        result = run_training_sync(
            TrainingRunConfig(
                yaml_path=dataset_result.yaml_path,
                base_weights_path=base_weights_path,
                output_weights_path=output_weights_abspath,
                project_dir=dataset_root / "_runs",
                epochs=epochs,
                imgsz=imgsz,
                batch_size=batch_size,
                on_status=on_status,
                on_epoch_end=on_epoch_end,
            )
        )

        if is_task_cancelled_sync(db, task):
            # Удалим только что сохранённые веса — задачу отменили.
            output_weights_abspath.unlink(missing_ok=True)
            _reset_model_after_failure(db, model)
            return

        # --- 4. Фиксация результата ---

        model.weights_path = output_weights_relpath
        model.metrics = result.metrics
        model.trained_at = datetime.now()
        db.commit()

        set_task_state_sync(
            db,
            task,
            status="succeeded",
            stage="Готово",
            message="Обучение завершено",
            result={
                "model_id": str(model.id),
                "weights_path": output_weights_relpath,
                "class_keys": training_data.class_keys,
                "class_meta": training_data.class_meta,
                "metrics": result.metrics,
            },
        )

    except Exception:
        # Если успели создать файл весов — удаляем. Внешний обработчик выше
        # выставит task.status = failed и сбросит поля модели.
        output_weights_abspath.unlink(missing_ok=True)
        raise
    finally:
        if dataset_root is not None:
            shutil.rmtree(dataset_root, ignore_errors=True)
