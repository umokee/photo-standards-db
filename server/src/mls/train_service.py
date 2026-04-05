import asyncio
import multiprocessing
import random
import shutil
from dataclasses import dataclass
from datetime import datetime
from uuid import UUID

import yaml
from config import MAX_SUM_TRAIN_VAL_RATIO, MAX_TRAIN_RATIO, STORAGE_PATH, settings
from exception import NotFoundError, ValidationError
from groups.models import Group
from PIL import Image
from segments.models import SegmentGroup
from sqlalchemy import Engine, create_engine, func, select
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import Session, selectinload
from standards.models import Standard, StandardImage
from ultralytics import YOLO

from .models import MlModel, Status, TrainingTask
from .schemas import MlModelTrainRequest


@dataclass
class TrainingAnnotation:
    class_name: str
    class_index: int
    points: list[list[list[float]]]


@dataclass
class TrainingImage:
    image_id: UUID
    image_path: str
    is_annotated: bool
    annotations: list[TrainingAnnotation]


@dataclass
class TrainingStandard:
    standard_id: UUID
    standard_name: str
    angle: str | None
    images: list[TrainingImage]


@dataclass
class TrainingData:
    group_id: UUID
    group_name: str
    class_names: list[str]
    standards: list[TrainingStandard]


@dataclass
class TrainingSplitPlan:
    train: list[UUID]
    val: list[UUID]
    test: list[UUID]
    total: int


async def _build_training_data(
    db: AsyncSession,
    group_id: UUID,
) -> TrainingData:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id, "не найдена")

    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
            selectinload(Standard.segments),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
        )
        .where(Standard.group_id == group.id)
    )
    standards = result.scalars().all()

    all_segments = [seg for standard in standards for seg in standard.segments]
    class_names = list(dict.fromkeys(seg.name for seg in all_segments))
    class_index_map = {name: i for i, name in enumerate(class_names)}
    segment_class_map = {
        seg.id: (class_index_map[seg.name], seg.name) for seg in all_segments
    }

    return TrainingData(
        group_id=group.id,
        group_name=group.name,
        class_names=class_names,
        standards=[
            TrainingStandard(
                standard_id=standard.id,
                standard_name=standard.name,
                angle=standard.angle,
                images=[
                    TrainingImage(
                        image_id=image.id,
                        image_path=image.image_path,
                        is_annotated=bool(image.annotations),
                        annotations=[
                            TrainingAnnotation(
                                class_name=segment_class_map[a.segment_id][1],
                                class_index=segment_class_map[a.segment_id][0],
                                points=a.points,
                            )
                            for a in image.annotations
                        ],
                    )
                    for image in standard.images
                ],
            )
            for standard in standards
        ],
    )


def _validate_training_data(data: TrainingData) -> None:
    if not data.standards:
        raise ValidationError("Группа не содержит эталонов")
    if not data.class_names:
        raise ValidationError("Группа не содержит сегментов")
    if not any(standard.images for standard in data.standards):
        raise ValidationError("Группа не содержит фотографий")
    if not any(
        image.is_annotated for standard in data.standards for image in standard.images
    ):
        raise ValidationError("Группа не содержит аннотаций")
    if not all(standard.images for standard in data.standards):
        raise ValidationError("Не все эталоны имеют фотографии")
    if not all(
        any(image.is_annotated for image in standard.images)
        for standard in data.standards
    ):
        raise ValidationError("Не все эталоны имеют аннотации")
    if not all(
        annotation.points
        for standard in data.standards
        for image in standard.images
        for annotation in image.annotations
    ):
        raise ValidationError("Не все аннотации имеют полигоны")


def _plan_dataset_split(
    data: TrainingData,
    train_ratio: int,
    val_ratio: int,
) -> TrainingSplitPlan:

    if train_ratio > MAX_TRAIN_RATIO:
        raise ValidationError(f"train не может превышать {MAX_TRAIN_RATIO}%")
    if train_ratio + val_ratio > MAX_SUM_TRAIN_VAL_RATIO:
        raise ValidationError(
            f"Сумма train и val не может превышать {MAX_SUM_TRAIN_VAL_RATIO}%"
        )

    train = []
    val = []
    test = []
    total = 0

    for standard in data.standards:
        images = [img.image_id for img in standard.images if img.is_annotated]
        images_count = len(images)
        random.shuffle(images)

        train_count = int(images_count * train_ratio / 100)
        val_count = int(images_count * val_ratio / 100)

        train += images[:train_count]
        val += images[train_count : train_count + val_count]
        test += images[train_count + val_count :]
        total += images_count

    return TrainingSplitPlan(
        train=train,
        val=val,
        test=test,
        total=total,
    )


def _build_dataset(
    data: TrainingData,
    split_plan: TrainingSplitPlan,
) -> str:
    base_path = STORAGE_PATH / "models" / str(data.group_id) / "temp"

    if base_path.exists():
        shutil.rmtree(str(base_path))
    for split in ["train", "val", "test"]:
        (base_path / "images" / split).mkdir(parents=True, exist_ok=True)
        (base_path / "labels" / split).mkdir(parents=True, exist_ok=True)

    image_map = {
        img.image_id: img for standard in data.standards for img in standard.images
    }

    for split, image_ids in [
        ("train", split_plan.train),
        ("val", split_plan.val),
        ("test", split_plan.test),
    ]:
        images_path = base_path / "images" / split
        labels_path = base_path / "labels" / split
        for image_id in image_ids:
            image = image_map[image_id]
            img_path = STORAGE_PATH / image.image_path
            (images_path / img_path.name).symlink_to(img_path)
            with open(labels_path / f"{img_path.stem}.txt", "w", encoding="utf-8") as f:
                width, height = Image.open(img_path).size
                for annotation in image.annotations:
                    for polygon in annotation.points:
                        coords = " ".join(
                            f"{x / width} {y / height}" for x, y in polygon
                        )
                        f.write(f"{annotation.class_index} {coords}\n")

    yaml_path = base_path / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(
            {
                "path": str(base_path),
                "train": "images/train",
                "val": "images/val",
                "test": "images/test",
                "nc": len(data.class_names),
                "names": data.class_names,
            },
            f,
            allow_unicode=True,
        )

    return str(yaml_path)


async def _next_version(db: AsyncSession, group_id: UUID) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(MlModel.version), 0)).where(
            MlModel.group_id == group_id
        )
    )
    return result.scalar() + 1


def _update_task_status(
    engine: Engine,
    task_id: UUID,
    status: Status,
    error: str | None = None,
    started_at: datetime | None = None,
    finished_at: datetime | None = None,
) -> None:
    with Session(engine) as db:
        task = db.get(TrainingTask, task_id)
        task.status = status
        if error:
            task.error = error
        if started_at:
            task.started_at = started_at
        if finished_at:
            task.finished_at = finished_at
        db.commit()


def _update_task_progress(
    engine: Engine,
    task_id: UUID,
    progress: int,
    stage: str,
) -> None:
    with Session(engine) as db:
        task = db.get(TrainingTask, task_id)
        task.progress = progress
        task.stage = stage
        db.commit()


async def _prepare_dataset(group_id: UUID, train_ratio: int, val_ratio: int) -> str:
    engine = create_async_engine(settings.database_url)
    async with AsyncSession(engine) as db:
        data = await _load_training_data(db, group_id)
        split_plan = _plan_dataset_split(data, train_ratio, val_ratio)
        yaml_path = _build_dataset(data, split_plan)
        return yaml_path


def _training_worker(
    task_id: UUID,
    model_id: UUID,
    group_id: UUID,
    version: int,
    weights_path: str,
    epochs: int,
    imgsz: int,
    batch_size: int,
    train_ratio: int,
    val_ratio: int,
) -> None:
    engine = create_engine(settings.database_url_sync)
    temp_dir = STORAGE_PATH / "models" / str(group_id) / "temp"

    try:
        _update_task_status(engine, task_id, "preparing")
        yaml_path = asyncio.run(_prepare_dataset(group_id, train_ratio, val_ratio))
        _update_task_status(engine, task_id, "training", started_at=datetime.now())

        model = YOLO(weights_path)
        model.add_callback(
            "on_train_epoch_end",
            lambda trainer: _update_task_progress(
                engine,
                task_id=task_id,
                progress=trainer.epoch + 1,
                stage=f"Эпоха {trainer.epoch + 1}/{epochs}",
            ),
        )

        results = model.train(
            data=yaml_path,
            epochs=epochs,
            imgsz=imgsz,
            batch=batch_size,
            project=str(temp_dir),
            name="run",
            exist_ok=True,
        )

        src = temp_dir / "run" / "weights" / "best.pt"
        dst = STORAGE_PATH / "models" / str(group_id) / f"v{version}.pt"
        shutil.move(str(src), str(dst))

        _update_task_status(engine, task_id, "saving")
        with Session(engine) as db:
            ml_model = db.get(MlModel, model_id)
            ml_model.weights_path = f"models/{group_id}/v{version}.pt"
            ml_model.metrics = {
                "mAP50": results.results_dict.get("metrics/mAP50(B)"),
                "mAP50_95": results.results_dict.get("metrics/mAP50-95(B)"),
                "precision": results.results_dict.get("metrics/precision(B)"),
                "recall": results.results_dict.get("metrics/recall(B)"),
            }
            ml_model.trained_at = datetime.now()
            db.commit()

        _update_task_status(engine, task_id, "done", finished_at=datetime.now())
    except Exception as err:
        _update_task_status(
            engine, task_id, "failed", str(err), finished_at=datetime.now()
        )
    finally:
        shutil.rmtree(str(temp_dir), ignore_errors=True)
        _start_next_task()


def _start_next_task() -> None:
    engine = create_engine(settings.database_url_sync)
    with Session(engine) as db:
        active = db.execute(
            select(TrainingTask).where(
                TrainingTask.status.in_(["preparing", "training", "saving"])
            )
        ).scalar_one_or_none()
        if active:
            return

        while True:
            task = db.execute(
                select(TrainingTask)
                .where(TrainingTask.status == "pending")
                .order_by(TrainingTask.created_at)
                .limit(1)
            ).scalar_one_or_none()
            if not task:
                return

            model = db.get(MlModel, task.model_id) if task.model_id else None
            if not model:
                task.status = "failed"
                task.error = "Связанная модель для задачи не найдена"
                task.finished_at = datetime.now()
                db.commit()
                continue

            process = multiprocessing.Process(
                target=_training_worker,
                args=(
                    task.id,
                    model.id,
                    task.group_id,
                    model.version,
                    model.weights_path,
                    model.epochs,
                    model.imgsz,
                    model.batch_size,
                    task.train_ratio,
                    task.val_ratio,
                ),
            )
            process.start()
            return


async def run_train(
    db: AsyncSession,
    data: MlModelTrainRequest,
) -> TrainingTask:
    train_data = await _load_training_data(db, data.group_id)
    _validate_training_data(train_data)

    version = await _next_version(db, data.group_id)
    model = MlModel(
        group_id=data.group_id,
        name=f"{data.architecture}_v{version}",
        architecture=data.architecture,
        weights_path=str(
            STORAGE_PATH / "models" / "_basic" / f"{data.architecture}.pt"
        ),
        version=version,
        epochs=data.epochs,
        imgsz=data.imgsz,
        batch_size=data.batch_size,
        num_classes=len(train_data.class_names),
        class_names=train_data.class_names,
    )
    db.add(model)
    await db.flush()

    task = TrainingTask(
        group_id=data.group_id,
        model_id=model.id,
        status="pending",
        train_ratio=data.train_ratio,
        val_ratio=data.val_ratio,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task
