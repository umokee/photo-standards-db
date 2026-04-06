import random
import shutil
from dataclasses import dataclass
from uuid import UUID

import yaml
from config import MAX_SUM_TRAIN_VAL_RATIO, MAX_TRAIN_RATIO, STORAGE_PATH
from exception import NotFoundError, ValidationError
from groups.models import Group
from PIL import Image
from segments.models import SegmentGroup
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload
from standards.models import Standard, StandardImage

from .models import MlModel, TrainingTask
from .schemas import MlModelTrainRequest
from .weights import canonicalize_weights_path

BASE_WEIGHTS_FILE_MAP = {
    "yolov26n-seg": "yolo26n-seg.pt",
    "yolov26s-seg": "yolo26s-seg.pt",
    "yolov26m-seg": "yolo26m-seg.pt",
    "yolov26l-seg": "yolo26l-seg.pt",
    "yolov26x-seg": "yolo26x-seg.pt",
}

ACTIVE_TRAINING_TASK_STATUSES = ("pending", "preparing", "training", "saving")


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


def _standard_load_options():
    """Общие options для загрузки standards с images, annotations, segments."""
    return [
        selectinload(Standard.images).selectinload(StandardImage.annotations),
        selectinload(Standard.segments),
        selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
    ]


def _build_training_data(group: Group, standards: list[Standard]) -> TrainingData:
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


async def load_training_data(
    db: AsyncSession,
    group_id: UUID,
) -> TrainingData:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id, "не найдена")

    result = await db.execute(
        select(Standard)
        .options(*_standard_load_options())
        .where(Standard.group_id == group.id)
    )
    standards = result.scalars().all()
    return _build_training_data(group, standards)


def load_training_data_sync(
    db: Session,  # <-- SYNC Session, не AsyncSession!
    group_id: UUID,
) -> TrainingData:
    """Синхронная версия для worker-потока."""
    group = db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id, "не найдена")

    result = db.execute(
        select(Standard)
        .options(*_standard_load_options())
        .where(Standard.group_id == group.id)
    )
    standards = result.scalars().all()
    return _build_training_data(group, standards)


def validate_training_data(data: TrainingData) -> None:
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


def plan_dataset_split(
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

        train_count = max(1, int(images_count * train_ratio / 100))
        val_count = int(images_count * val_ratio / 100)

        if train_count + val_count > images_count:
            val_count = images_count - train_count

        train += images[:train_count]
        val += images[train_count : train_count + val_count]
        test += images[train_count + val_count :]
        total += images_count

    if not val:
        val = list(train)

    return TrainingSplitPlan(
        train=train,
        val=val,
        test=test,
        total=total,
    )


def build_dataset(
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
        select(func.coalesce(func.max(MlModel.version), 0))
        .select_from(MlModel)
        .outerjoin(TrainingTask, TrainingTask.model_id == MlModel.id)
        .where(
            MlModel.group_id == group_id,
            or_(
                MlModel.trained_at.is_not(None),
                TrainingTask.status.in_(ACTIVE_TRAINING_TASK_STATUSES),
            ),
        )
    )
    return result.scalar() + 1


async def run_train(db: AsyncSession, data: MlModelTrainRequest) -> TrainingTask:
    train_data = await load_training_data(db, data.group_id)
    validate_training_data(train_data)

    version = await _next_version(db, data.group_id)
    base_weights_filename = BASE_WEIGHTS_FILE_MAP[data.architecture]
    base_weights_path = STORAGE_PATH / "models" / "_basic" / base_weights_filename
    if not base_weights_path.is_file():
        raise ValidationError(f"Базовые веса не найдены: {base_weights_path}")

    model = MlModel(
        group_id=data.group_id,
        name=f"{data.architecture}_v{version}",
        architecture=data.architecture,
        weights_path=canonicalize_weights_path(str(base_weights_path)),
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
    await db.refresh(model)
    await db.refresh(task)

    from mls.worker import notify

    notify()

    return task
