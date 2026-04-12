import logging
import shutil
from datetime import datetime
from pathlib import Path
from uuid import UUID

from _shared.constants import training
from config import (
    STORAGE_PATH,
)
from mls.train_service import (
    build_dataset,
    load_training_data_sync,
    plan_dataset_split,
    validate_training_data,
)
from tasks.app import app
from tasks.db import get_sync_session
from ultralytics import YOLO

PENDING, PREPARING, TRAINING, SAVING, DONE, FAILED = training.statuses.all

logger = logging.getLogger("tasks.training")


def _update_model(model_id: UUID, **fields) -> None:
    from mls.models import MlModel

    with get_sync_session() as db:
        model = db.get(MlModel, model_id)
        if not model:
            logger.error("Модель %s не найдена", model_id)
            raise RuntimeError(f"Модель {model_id} не найдена")
        for key, val in fields.items():
            setattr(model, key, val)
        db.commit()


@app.task(queue="training")
def execute_training(
    *,
    model_id: str,
    group_id: str,
    train_ratio: int,
    val_ratio: int,
    epochs: int,
    imgsz: int,
    batch_size: int,
    weights_path: str,
    version: int,
) -> None:
    mid = UUID(model_id)
    gid = UUID(group_id)
    temp = STORAGE_PATH / "models" / group_id / "temp"

    try:
        _update_model(
            mid,
            training_status=PREPARING,
            training_stage=None,
            training_progress=None,
            training_error=None,
        )

        with get_sync_session() as db:
            data = load_training_data_sync(db, gid)

        validate_training_data(data)
        split = plan_dataset_split(data, train_ratio, val_ratio)
        yaml_path = build_dataset(data, split)

        _update_model(
            mid,
            total_images=split.total,
            train_count=len(split.train),
            val_count=len(split.val),
            test_count=len(split.test),
        )

        logger.info(
            "Модель %s: dataset (train=%d, val=%d, test=%d)",
            mid,
            len(split.train),
            len(split.val),
            len(split.test),
        )

        _update_model(
            mid,
            training_status=TRAINING,
            training_started_at=datetime.now(),
        )

        yolo = YOLO(str(STORAGE_PATH / Path(weights_path)))
        yolo.add_callback(
            "on_train_epoch_end",
            lambda trainer: _update_model(
                mid,
                training_progress=trainer.epoch + 1,
                training_stage=f"Эпоха {trainer.epoch + 1}/{epochs}",
            ),
        )

        results = yolo.train(
            data=yaml_path,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch_size,
            project=str(temp),
            name="run",
            exist_ok=True,
        )

        _update_model(
            mid,
            training_status=SAVING,
            training_stage="Сохранение весов",
        )

        src = temp / "run" / "weights" / "best.pt"
        if not src.exists():
            logger.error("best.pt не найден: %s", src)
            raise FileNotFoundError(f"best.pt не найден: {src}")

        dest = STORAGE_PATH / "models" / group_id / f"v{version}.pt"
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(src), str(dest))

        _update_model(
            mid,
            weights_path=f"models/{group_id}/v{version}.pt",
            metrics={
                "mAP50": results.results_dict.get("metrics/mAP50(B)"),
                "mAP50_95": results.results_dict.get("metrics/mAP50-95(B)"),
                "precision": results.results_dict.get("metrics/precision(B)"),
                "recall": results.results_dict.get("metrics/recall(B)"),
            },
            trained_at=datetime.now(),
            training_status=DONE,
            training_progress=None,
            training_stage=None,
            training_error=None,
            training_finished_at=datetime.now(),
            training_job_id=None,
        )
        logger.info("Модель %s обучена", mid)

    except Exception as e:
        logger.exception("Модель %s: ошибка", mid)

        failed_weights = STORAGE_PATH / "models" / group_id / f"v{version}.pt"
        if failed_weights.exists():
            failed_weights.unlink()

        _update_model(
            mid,
            training_status=FAILED,
            training_error=str(e)[:500],
            training_finished_at=datetime.now(),
            training_job_id=None,
        )
        raise
    finally:
        shutil.rmtree(str(temp), ignore_errors=True)
