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
from procrastinate import exceptions
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
    model.weights_path = None
    model.metrics = None
    model.trained_at = None
    db.commit()


@app.task(queue="gpu", pass_context=True)
def execute_training(context, *, task_id: str) -> None:
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
            _run_training_job(db, task, model, context)
        except exceptions.JobAborted:
            db.rollback()
            current = get_task_sync(db, tid)
            if current is not None and current.status != "cancelled":
                set_task_state_sync(
                    db,
                    current,
                    status="paused",
                    stage="Приостановлено",
                    message="Обучение приостановлено ради проверки",
                )
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


def _run_training_job(db: Session, task: Task, model: MlModel, context) -> None:
    payload = task.payload or {}

    base_weights_path = resolve_storage_path(payload["base_weights_path"])
    dataset_root = resolve_storage_path(payload["dataset_root"])
    run_dir = resolve_storage_path(payload["run_dir"])
    checkpoint_path = resolve_storage_path(payload["checkpoint_path"])
    best_checkpoint_path = resolve_storage_path(payload["best_checkpoint_path"])
    output_weights_abspath = resolve_storage_path(payload["final_weights_path"])

    epochs = int(payload["epochs"])
    imgsz = int(payload["imgsz"])
    batch_size = int(payload["batch_size"])
    train_ratio = int(payload["train_ratio"])
    val_ratio = int(payload["val_ratio"])

    resume_mode = checkpoint_path.exists()

    set_task_state_sync(
        db,
        task,
        status="resuming" if resume_mode else "running",
        stage="Возобновление" if resume_mode else "Подготовка данных",
        message="Продолжаем обучение" if resume_mode else "Сбор данных для обучения",
    )

    if context.should_abort():
        raise exceptions.JobAborted("aborted before training start")

    training_data = load_training_data_sync(db, model.group_id)
    validate_training_data(training_data)
    split_plan = plan_dataset_split(
        training_data,
        train_ratio=train_ratio,
        val_ratio=val_ratio,
    )

    if context.should_abort():
        raise exceptions.JobAborted("aborted during dataset preparation")

    dataset_result = build_temp_dataset(
        training_data,
        split_plan,
        dataset_root=dataset_root,
    )

    model.num_classes = len(training_data.class_keys)
    model.class_keys = training_data.class_keys
    model.class_meta = training_data.class_meta
    model.total_images = split_plan.total
    model.train_count = len(split_plan.train)
    model.val_count = len(split_plan.val)
    model.test_count = len(split_plan.test)
    db.commit()

    def on_status(stage: str) -> None:
        readable = {
            "training": "Обучение",
            "saving": "Сохранение весов",
        }.get(stage, stage)
        set_task_state_sync(
            db,
            task,
            status="running",
            stage=readable,
            message=readable,
        )

    def on_epoch_end(current: int, total: int) -> None:
        set_task_progress_sync(
            db,
            task,
            current=current,
            total=total,
            stage=f"Эпоха {current}/{total}",
        )
        task.checkpoint_path = payload["checkpoint_path"]
        task.heartbeat_at = datetime.now()
        db.commit()

        if context.should_abort():
            task.abort_requested = True
            task.status = "pausing"
            task.stage = "Останавливаем обучение"
            task.message = "Освобождаем GPU для проверки"
            db.commit()
            raise exceptions.JobAborted("paused for inspection")

    def on_model_save(last_path: Path | None, best_path: Path | None) -> None:
        task.heartbeat_at = datetime.now()
        if last_path is not None:
            task.checkpoint_path = payload["checkpoint_path"]
        db.commit()

    result = run_training_sync(
        TrainingRunConfig(
            yaml_path=dataset_result.yaml_path,
            base_weights_path=base_weights_path,
            checkpoint_path=checkpoint_path,
            best_checkpoint_path=best_checkpoint_path,
            output_weights_path=output_weights_abspath,
            run_dir=run_dir,
            epochs=epochs,
            imgsz=imgsz,
            batch_size=batch_size,
            resume=resume_mode,
            save_period=1,
            on_status=on_status,
            on_epoch_end=on_epoch_end,
            on_model_save=on_model_save,
        )
    )

    if is_task_cancelled_sync(db, task):
        output_weights_abspath.unlink(missing_ok=True)
        return

    model.weights_path = payload["final_weights_path"]
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
            "weights_path": payload["final_weights_path"],
            "class_keys": training_data.class_keys,
            "class_meta": training_data.class_meta,
            "metrics": result.metrics,
        },
    )

    shutil.rmtree(dataset_root, ignore_errors=True)
