import logging
import shutil
import signal
import time
from datetime import datetime
from uuid import UUID

from config import STORAGE_PATH, settings
from mls.models import MlModel, TrainingTask
from mls.train_service import (
    build_dataset,
    load_training_data_sync,
    plan_dataset_split,
    validate_training_data,
)
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from ultralytics import YOLO

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("training-worker")

engine = create_engine(
    settings.database_url_sync,
    pool_size=2,
    max_overflow=0,
    pool_pre_ping=True,
)

POLL_INTERVAL = 5
_shutdown = False


def _handle_signal(signum, frame):
    """Graceful shutdown по SIGINT/SIGTERM."""
    global _shutdown
    logger.info("Получен сигнал завершения, заканчиваю текущую задачу...")
    _shutdown = True


signal.signal(signal.SIGINT, _handle_signal)
signal.signal(signal.SIGTERM, _handle_signal)


def _update_status(
    task_id: UUID,
    status: str,
    error: str | None = None,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
) -> None:
    with Session(engine) as db:
        task = db.get(TrainingTask, task_id)
        if not task:
            return
        task.status = status
        if error is not None:
            task.error = error[:500]
        if started_at is not None:
            task.started_at = started_at
        if finished_at is not None:
            task.finished_at = finished_at
        db.commit()


def _update_progress(task_id: UUID, progress: int, stage: str) -> None:
    with Session(engine) as db:
        task = db.get(TrainingTask, task_id)
        if not task:
            return
        task.progress = progress
        task.stage = stage
        db.commit()


def _claim_next_task() -> tuple[TrainingTask, MlModel] | None:
    with Session(engine) as db:
        active = db.execute(
            select(TrainingTask).where(
                TrainingTask.status.in_(["preparing", "training", "saving"])
            )
        ).scalar_one_or_none()

        if active:
            logger.warning(
                "Найдена активная задача %s в статусе '%s' — пропускаю цикл. "
                "Если воркер упал, смените статус на 'failed' вручную.",
                active.id,
                active.status,
            )
            return None

        task = db.execute(
            select(TrainingTask)
            .where(TrainingTask.status == "pending")
            .order_by(TrainingTask.created_at)
            .with_for_update(skip_locked=True)
            .limit(1)
        ).scalar_one_or_none()

        if not task:
            return None

        model = db.get(MlModel, task.model_id) if task.model_id else None
        if not model:
            task.status = "failed"
            task.error = "Связанная модель не найдена"
            task.finished_at = datetime.now()
            db.commit()
            logger.error("Задача %s: модель не найдена, пропускаю", task.id)
            return None

        task.status = "preparing"
        db.commit()

        task_id = task.id
        group_id = task.group_id
        train_ratio = task.train_ratio
        val_ratio = task.val_ratio
        model_id = model.id
        model_version = model.version
        model_weights_path = model.weights_path
        model_epochs = model.epochs
        model_imgsz = model.imgsz
        model_batch_size = model.batch_size

    from types import SimpleNamespace

    task_info = SimpleNamespace(
        id=task_id,
        group_id=group_id,
        train_ratio=train_ratio,
        val_ratio=val_ratio,
    )
    model_info = SimpleNamespace(
        id=model_id,
        version=model_version,
        weights_path=model_weights_path,
        epochs=model_epochs,
        imgsz=model_imgsz,
        batch_size=model_batch_size,
    )
    return task_info, model_info


def _execute_task(task, model) -> None:
    task_id = task.id
    group_id = task.group_id
    temp_dir = STORAGE_PATH / "models" / str(group_id) / "temp"

    try:
        logger.info("Задача %s: подготовка датасета", task_id)

        with Session(engine) as db:
            training_data = load_training_data_sync(db, group_id)

        validate_training_data(training_data)
        split_plan = plan_dataset_split(training_data, task.train_ratio, task.val_ratio)
        yaml_path = build_dataset(training_data, split_plan)

        _update_status(task_id, "training", started_at=datetime.now())
        logger.info("Задача %s: обучение запущено (%d эпох)", task_id, model.epochs)

        yolo = YOLO(model.weights_path)
        yolo.add_callback(
            "on_train_epoch_end",
            lambda trainer: _update_progress(
                task_id,
                progress=trainer.epoch + 1,
                stage=f"Эпоха {trainer.epoch + 1}/{model.epochs}",
            ),
        )

        results = yolo.train(
            data=yaml_path,
            epochs=model.epochs,
            imgsz=model.imgsz,
            batch=model.batch_size,
            project=str(temp_dir),
            name="run",
            exist_ok=True,
        )

        _update_status(task_id, "saving")
        logger.info("Задача %s: сохранение весов", task_id)

        src = temp_dir / "run" / "weights" / "best.pt"
        dst = STORAGE_PATH / "models" / str(group_id) / f"v{model.version}.pt"
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))

        with Session(engine) as db:
            ml_model = db.get(MlModel, model.id)
            ml_model.weights_path = f"models/{group_id}/v{model.version}.pt"
            ml_model.metrics = {
                "mAP50": results.results_dict.get("metrics/mAP50(B)"),
                "mAP50_95": results.results_dict.get("metrics/mAP50-95(B)"),
                "precision": results.results_dict.get("metrics/precision(B)"),
                "recall": results.results_dict.get("metrics/recall(B)"),
            }
            ml_model.trained_at = datetime.now()
            db.commit()

        _update_status(task_id, "done", finished_at=datetime.now())
        logger.info("Задача %s: завершена успешно", task_id)

    except Exception as err:
        logger.exception("Задача %s: ошибка", task_id)
        _update_status(task_id, "failed", error=str(err), finished_at=datetime.now())
    finally:
        shutil.rmtree(str(temp_dir), ignore_errors=True)


def main() -> None:
    logger.info(
        "Training worker запущен. Polling каждые %d сек. Ctrl+C для остановки.",
        POLL_INTERVAL,
    )

    while not _shutdown:
        try:
            claimed = _claim_next_task()
        except Exception:
            logger.exception(
                "Ошибка при захвате задачи, повтор через %d сек", POLL_INTERVAL
            )
            time.sleep(POLL_INTERVAL)
            continue

        if claimed:
            task, model = claimed
            logger.info("Задача %s: взята в работу", task.id)
            _execute_task(task, model)
            continue

        time.sleep(POLL_INTERVAL)

    logger.info("Worker остановлен.")


if __name__ == "__main__":
    main()
