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
from sqlalchemy.orm import Session

from .service import (
    build_temp_dataset,
    load_training_data_sync,
    plan_dataset_split,
    validate_training_data,
)

import_models()


def _get_task(
    db: Session,
    task_id: UUID,
) -> Task | None:
    return db.get(Task, task_id)


def _get_model(
    db: Session,
    model_id: UUID,
) -> MlModel | None:
    return db.get(MlModel, model_id)


def _set_task_state(
    db: Session,
    task: Task,
    *,
    status: str | None = None,
    stage: str | None = None,
    message: str | None = None,
    error: str | None = None,
    result: dict | None = None,
) -> None:
    if status is not None:
        task.status = status
    if stage is not None:
        task.stage = stage
    if message is not None:
        task.message = message
    if error is not None:
        task.error = error[:2000]
    if result is not None:
        task.result = result

    if task.status == "running" and task.started_at is None:
        task.started_at = datetime.now()

    if task.status in {"succeeded", "failed", "cancelled"} and task.finished_at is None:
        task.finished_at = datetime.now()

    db.commit()


def _set_task_progress(
    db: Session,
    task: Task,
    *,
    current: int,
    total: int,
    stage: str,
) -> None:
    task.progress_current = current
    task.progress_total = total
    task.progress_percent = round(current / total * 100) if total else None
    task.stage = stage
    db.commit()


@app.task(queue="training")
def execute_training(*, task_id: str) -> None:
    tid = UUID(task_id)

    with get_sync_session() as db:
        task = _get_task(db, tid)
        if not task:
            return

        if task.status == "cancelled":
            return

        if task.entity_type != "ml_model" or not task.entity_id:
            _set_task_state(
                db,
                task,
                status="failed",
                stage="Ошибка",
                error="Задача не связана с моделью",
            )
            return

        model = _get_model(db, task.entity_id)
        if not model:
            _set_task_state(
                db,
                task,
                status="failed",
                stage="Ошибка",
                error="Модель не найдена",
            )
            return

        payload = task.payload or {}
        base_weights_path = resolve_storage_path(payload["base_weights_path"])
        dataset_root: Path | None = None
        output_weights_relpath = (
            Path("models") / str(model.group_id) / f"v{model.version}.pt"
        ).as_posix()
        output_weights_abspath = resolve_storage_path(output_weights_relpath)

        try:
            _set_task_state(
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
                train_ratio=int(payload["train_ratio"]),
                val_ratio=int(payload["val_ratio"]),
            )

            dataset_result = build_temp_dataset(training_data, split_plan)
            dataset_root = dataset_result.dataset_root

            model.num_classes = len(training_data.class_names)
            model.class_names = training_data.class_names
            model.total_images = split_plan.total
            model.train_count = len(split_plan.train)
            model.val_count = len(split_plan.val)
            model.test_count = len(split_plan.test)
            db.commit()

            def on_status(
                stage: str,
            ) -> None:
                readable_stage = {
                    "training": "Обучение",
                    "saving": "Сохранение весов",
                }.get(stage, stage)

                _set_task_state(
                    db,
                    task,
                    status="running",
                    stage=readable_stage,
                    message=readable_stage,
                )

            def on_epoch_end(
                current: int,
                total: int,
            ) -> None:
                _set_task_progress(
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
                    epochs=int(payload["epochs"]),
                    imgsz=int(payload["imgsz"]),
                    batch_size=int(payload["batch_size"]),
                    on_status=on_status,
                    on_epoch_end=on_epoch_end,
                )
            )

            model.weights_path = output_weights_relpath
            model.metrics = result.metrics
            model.trained_at = datetime.now()
            db.commit()

            _set_task_state(
                db,
                task,
                status="succeeded",
                stage="Готово",
                message="Обучение завершено",
                result={
                    "model_id": str(model.id),
                    "weights_path": output_weights_relpath,
                    "metrics": result.metrics,
                },
            )

        except Exception as exc:
            if output_weights_abspath.exists():
                output_weights_abspath.unlink(missing_ok=True)

            model.weights_path = None
            model.metrics = None
            model.trained_at = None
            db.commit()

            _set_task_state(
                db,
                task,
                status="failed",
                stage="Ошибка",
                error=str(exc),
            )
        finally:
            if dataset_root is not None:
                shutil.rmtree(dataset_root, ignore_errors=True)
