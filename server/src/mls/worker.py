import logging
import shutil
import threading
from datetime import datetime
from uuid import UUID

from config import (
    ACTIVE_TASK_STATUSES,
    FALLBACK_POLL_INTERVAL,
    MAX_RESTART_DELAY,
    RESTART_DELAY,
    STORAGE_PATH,
    settings,
)
from mls.models import MlModel, TrainingTask
from mls.train_service import (
    build_dataset,
    load_training_data_sync,
    plan_dataset_split,
    validate_training_data,
)
from mls.weights import resolve_weights_path
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from ultralytics import YOLO

logger = logging.getLogger("training-worker")


_engine = None
_engine_lock = threading.Lock()


def _get_engine():
    global _engine
    if _engine is None:
        with _engine_lock:
            if _engine is None:
                _engine = create_engine(
                    settings.database_url_sync,
                    pool_size=2,
                    max_overflow=0,
                    pool_pre_ping=True,
                )
                logger.info("Sync SQLAlchemy engine создан")
    return _engine


_shutdown = threading.Event()
_new_task_event = threading.Event()
_worker_thread: threading.Thread | None = None


def notify() -> None:
    _new_task_event.set()


def _update_status(
    task_id: UUID,
    status: str,
    error: str | None = None,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
) -> None:
    try:
        with Session(_get_engine()) as db:
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
    except Exception:
        logger.exception("Не удалось обновить статус задачи %s", task_id)


def _update_progress(task_id: UUID, progress: int, stage: str) -> None:
    try:
        with Session(_get_engine()) as db:
            task = db.get(TrainingTask, task_id)
            if not task:
                return
            task.progress = progress
            task.stage = stage
            db.commit()
    except Exception:
        logger.exception("Не удалось обновить прогресс задачи %s", task_id)


def _delete_draft_model(task_id: UUID) -> None:
    try:
        with Session(_get_engine()) as db:
            task = db.get(TrainingTask, task_id)
            if not task or not task.model_id:
                return

            model = db.get(MlModel, task.model_id)
            if not model or model.trained_at is not None:
                return

            weights_file = (
                STORAGE_PATH / "models" / str(task.group_id) / f"v{model.version}.pt"
            )
            if weights_file.exists():
                weights_file.unlink()

            db.delete(model)
            db.commit()
    except Exception:
        logger.exception("Не удалось удалить черновую модель для задачи %s", task_id)


def _recover_stale_tasks(db: Session) -> None:
    stale_tasks = (
        db.execute(
            select(TrainingTask).where(
                TrainingTask.status.in_(ACTIVE_TASK_STATUSES[1:]),
            )
        )
        .scalars()
        .all()
    )

    for task in stale_tasks:
        stale_status = task.status
        logger.warning(
            "Задача %s зависла в статусе '%s' - помечаю как failed",
            task.id,
            stale_status,
        )
        task.status = "failed"
        task.error = f"Воркер был перезапущен (зависший статус: {stale_status})"
        task.finished_at = datetime.now()
        if task.model_id:
            model = db.get(MlModel, task.model_id)
            if model and model.trained_at is None:
                weights_file = (
                    STORAGE_PATH
                    / "models"
                    / str(task.group_id)
                    / f"v{model.version}.pt"
                )
                if weights_file.exists():
                    weights_file.unlink()
                db.delete(model)

    if stale_tasks:
        db.commit()
        logger.info("Восстановлено %d зависших задач", len(stale_tasks))


def _claim_next_task():
    with Session(_get_engine()) as db:
        _recover_stale_tasks(db)

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

        from types import SimpleNamespace

        task_info = SimpleNamespace(
            id=task.id,
            group_id=task.group_id,
            train_ratio=task.train_ratio,
            val_ratio=task.val_ratio,
        )
        model_info = SimpleNamespace(
            id=model.id,
            version=model.version,
            weights_path=model.weights_path,
            epochs=model.epochs,
            imgsz=model.imgsz,
            batch_size=model.batch_size,
        )
        return task_info, model_info


def _execute_task(task, model) -> None:
    task_id = task.id
    group_id = task.group_id
    temp_dir = STORAGE_PATH / "models" / str(group_id) / "temp"

    try:
        logger.info("Задача %s: загрузка данных для группы %s", task_id, group_id)

        with Session(_get_engine()) as db:
            training_data = load_training_data_sync(db, group_id)

        validate_training_data(training_data)
        split_plan = plan_dataset_split(training_data, task.train_ratio, task.val_ratio)
        yaml_path = build_dataset(training_data, split_plan)

        logger.info(
            "Задача %s: датасет готов (train=%d, val=%d, test=%d)",
            task_id,
            len(split_plan.train),
            len(split_plan.val),
            len(split_plan.test),
        )

        _update_status(task_id, "training", started_at=datetime.now())
        logger.info("Задача %s: обучение запущено (%d эпох)", task_id, model.epochs)

        weights_path = resolve_weights_path(model.weights_path)
        logger.info("Задача %s: веса загружаются из %s", task_id, weights_path)

        yolo = YOLO(str(weights_path))

        def on_epoch_end(trainer):
            epoch = trainer.epoch + 1
            _update_progress(
                task_id,
                progress=epoch,
                stage=f"Эпоха {epoch}/{model.epochs}",
            )
            if epoch % 10 == 0 or epoch == 1:
                logger.info("Задача %s: эпоха %d/%d", task_id, epoch, model.epochs)

        yolo.add_callback("on_train_epoch_end", on_epoch_end)

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
        if not src.exists():
            raise FileNotFoundError(f"best.pt не найден: {src}")

        dst = STORAGE_PATH / "models" / str(group_id) / f"v{model.version}.pt"
        dst.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dst))

        with Session(_get_engine()) as db:
            ml_model = db.get(MlModel, model.id)
            if ml_model:
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
        logger.exception("Задача %s: ошибка при обучении", task_id)
        _update_status(
            task_id, "failed", error=str(err)[:500], finished_at=datetime.now()
        )
        _delete_draft_model(task_id)
    finally:
        shutil.rmtree(str(temp_dir), ignore_errors=True)


def _run_loop() -> None:
    logger.info("Worker loop запущен (poll=%ds)", FALLBACK_POLL_INTERVAL)

    while not _shutdown.is_set():
        _new_task_event.clear()

        try:
            claimed = _claim_next_task()
        except Exception:
            logger.exception("Ошибка при захвате задачи из очереди")
            _shutdown.wait(timeout=FALLBACK_POLL_INTERVAL)
            continue

        if claimed:
            task, model = claimed
            logger.info("Задача %s: взята в работу", task.id)
            _execute_task(task, model)
            continue

        _new_task_event.wait(timeout=FALLBACK_POLL_INTERVAL)


def _worker_entry() -> None:
    delay = RESTART_DELAY

    while not _shutdown.is_set():
        try:
            _run_loop()
            break
        except Exception:
            logger.exception(
                "Worker loop неожиданно упал, перезапуск через %d сек", delay
            )
            _shutdown.wait(timeout=delay)
            delay = min(delay * 2, MAX_RESTART_DELAY)
            logger.info("Перезапуск worker loop...")

    logger.info("Worker thread завершён")


def start() -> None:
    global _worker_thread
    if _worker_thread and _worker_thread.is_alive():
        logger.info("Training worker уже запущен")
        return

    _shutdown.clear()
    _new_task_event.clear()

    try:
        engine = _get_engine()
        with Session(engine) as db:
            db.execute(select(1))
        logger.info("Подключение к БД (sync) проверено")
    except Exception:
        logger.exception("Не удалось подключиться к БД для worker — worker НЕ запущен")
        return

    _worker_thread = threading.Thread(
        target=_worker_entry, daemon=True, name="training-worker"
    )
    _worker_thread.start()
    _new_task_event.set()
    logger.info("Training worker запущен в фоновом потоке")


def stop() -> None:
    _shutdown.set()
    _new_task_event.set()
    if _worker_thread:
        _worker_thread.join(timeout=15)
    logger.info("Training worker остановлен")
