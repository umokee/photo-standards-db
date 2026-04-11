import logging
import random
import shutil
from dataclasses import dataclass
from uuid import UUID

import yaml
from _shared.constants import training
from config import STORAGE_PATH
from exception import ConflictError, NotFoundError, ValidationError
from groups.models import Group
from PIL import Image
from segments.models import SegmentGroup
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload
from standards.models import Standard, StandardImage

from .models import MlModel
from .schemas import MlModelTrainRequest

logger = logging.getLogger("mls.service")


@dataclass
class TrainingAnnotation:
    class_name: str
    class_index: int
    points: list[list[list[float]]]


@dataclass
class TrainingImage:
    image_id: UUID
    image_path: str
    width: int
    height: int
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
    return [
        selectinload(Standard.images).selectinload(StandardImage.annotations),
        selectinload(Standard.segments),
        selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
    ]


def _get_image_size(image_path: str) -> tuple[int, int]:
    img_path = STORAGE_PATH / image_path
    with Image.open(img_path) as img:
        return img.size


def _build_training_data(group: Group, standards: list[Standard]) -> TrainingData:
    all_segments = [seg for standard in standards for seg in standard.segments]
    class_names = list(dict.fromkeys(seg.name for seg in all_segments))
    class_index_map = {name: i for i, name in enumerate(class_names)}
    segment_class_map = {
        seg.id: (class_index_map[seg.name], seg.name) for seg in all_segments
    }

    training_standards: list[TrainingStandard] = []

    for std in standards:
        training_images: list[TrainingImage] = []

        for img in std.images:
            width, height = _get_image_size(img.image_path)

            training_images.append(
                TrainingImage(
                    image_id=img.id,
                    image_path=img.image_path,
                    width=width,
                    height=height,
                    is_annotated=bool(img.annotations),
                    annotations=[
                        TrainingAnnotation(
                            class_name=segment_class_map[a.segment_id][1],
                            class_index=segment_class_map[a.segment_id][0],
                            points=a.points,
                        )
                        for a in img.annotations
                    ],
                )
            )

        training_standards.append(
            TrainingStandard(
                standard_id=std.id,
                standard_name=std.name,
                angle=std.angle,
                images=training_images,
            )
        )

    return TrainingData(
        group_id=group.id,
        group_name=group.name,
        class_names=class_names,
        standards=training_standards,
    )


async def load_training_data(
    db: AsyncSession,
    group_id: UUID,
) -> TrainingData:
    group = await db.get(Group, group_id)
    if not group:
        logger.error("Группа %s не найдена", group_id)
        raise NotFoundError("Группа", "group", group_id)

    result = await db.execute(
        select(Standard)
        .options(*_standard_load_options())
        .where(Standard.group_id == group.id)
    )
    standards = result.scalars().all()
    logger.info("Группа %s содержит %d эталонов", group.name, len(standards))
    return _build_training_data(group, standards)


def load_training_data_sync(
    db: Session,
    group_id: UUID,
) -> TrainingData:
    group = db.get(Group, group_id)
    if not group:
        logger.error("Группа %s не найдена", group_id)
        raise NotFoundError("Группа", "group", group_id)

    result = db.execute(
        select(Standard)
        .options(*_standard_load_options())
        .where(Standard.group_id == group.id)
    )
    standards = result.scalars().all()
    logger.info("Группа %s содержит %d эталонов", group.name, len(standards))
    return _build_training_data(group, standards)


def validate_training_data(data: TrainingData) -> None:
    if not data.standards:
        raise ValidationError("Группа не содержит эталонов")
    if not data.class_names:
        raise ValidationError("Группа не содержит сегментов")

    has_any_images = False
    has_any_annotations = False
    all_standards_have_images = True
    all_standards_have_annotations = True
    all_annotations_have_points = True

    for std in data.standards:
        standard_has_images = bool(std.images)
        standard_has_annotations = False

        if not standard_has_images:
            all_standards_have_images = False
            continue

        has_any_images = True

        for img in std.images:
            if not img.is_annotated:
                continue

            has_any_annotations = True
            standard_has_annotations = True

            for ann in img.annotations:
                if not ann.points:
                    all_annotations_have_points = False

        if not standard_has_annotations:
            all_standards_have_annotations = False

    if not has_any_images:
        raise ValidationError("Группа не содержит фотографий")
    if not has_any_annotations:
        raise ValidationError("Группа не содержит аннотаций")
    if not all_standards_have_images:
        raise ValidationError("Не все эталоны имеют фотографии")
    if not all_standards_have_annotations:
        raise ValidationError("Не все эталоны имеют аннотации")
    if not all_annotations_have_points:
        raise ValidationError("Не все аннотации имеют полигоны")


def plan_dataset_split(
    data: TrainingData,
    train_ratio: int,
    val_ratio: int,
) -> TrainingSplitPlan:
    ratio_sum_max = min(training.split.ratio_sum_max, 100)

    if train_ratio < 0 or val_ratio < 0:
        raise ValidationError("train и val не могут быть отрицательными")
    if train_ratio > training.train_ratio.max:
        raise ValidationError(f"train не может превышать {training.train_ratio.max}%")
    if val_ratio > training.val_ratio.max:
        raise ValidationError(f"val не может превышать {training.val_ratio.max}%")
    if train_ratio + val_ratio > ratio_sum_max:
        raise ValidationError(f"Сумма train и val не может превышать {ratio_sum_max}%")

    seed = hash((data.group_id, train_ratio, val_ratio))
    train, val, test, total = [], [], [], 0
    for std in data.standards:
        images = [img.image_id for img in std.images if img.is_annotated]
        img_count = len(images)

        if img_count == 0:
            continue
        if img_count < training.split.min_images_to_train:
            raise ValidationError(
                f"Минимум {training.split.min_images_to_train} размеченных фото на эталон"
            )

        rand = random.Random(seed ^ hash(std.standard_id))  # noqa: S311
        rand.shuffle(images)
        tc = max(1, int(img_count * train_ratio / 100)) if train_ratio > 0 else 0
        vc = max(1, int(img_count * val_ratio / 100)) if val_ratio > 0 else 0

        if tc + vc > img_count:
            raise ValidationError(
                f"'{std.standard_name}': мало фото для split {train_ratio}/{val_ratio}%"
            )

        train.extend(images[:tc])
        val.extend(images[tc : tc + vc])
        test.extend(images[tc + vc :])
        total += img_count

    if not train:
        raise ValidationError("Не удалось сформировать train split")
    if val_ratio > 0 and not val:
        raise ValidationError("Не удалось сформировать val split")

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
    base = STORAGE_PATH / "models" / str(data.group_id) / "temp"

    if base.exists():
        shutil.rmtree(str(base))
    for split in ["train", "val", "test"]:
        (base / "images" / split).mkdir(parents=True, exist_ok=True)
        (base / "labels" / split).mkdir(parents=True, exist_ok=True)

    img_map = {img.image_id: img for std in data.standards for img in std.images}

    for split, ids in [
        ("train", split_plan.train),
        ("val", split_plan.val),
        ("test", split_plan.test),
    ]:
        for id in ids:
            img = img_map[id]
            img_path = STORAGE_PATH / img.image_path
            name = str(id)
            (base / "images" / split / f"{name}{img_path.suffix}").symlink_to(img_path)
            with open(
                base / "labels" / split / f"{name}.txt", "w", encoding="utf-8"
            ) as f:
                width, height = img.width, img.height
                for ann in img.annotations:
                    for poly in ann.points:
                        coords = " ".join(f"{x / width} {y / height}" for x, y in poly)
                        f.write(f"{ann.class_index} {coords}\n")

    yaml_path = base / "data.yaml"
    with open(yaml_path, "w", encoding="utf-8") as f:
        yaml.dump(
            {
                "path": str(base),
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


async def run_train(db: AsyncSession, data: MlModelTrainRequest) -> MlModel:
    active = await db.execute(
        select(MlModel).where(
            MlModel.group_id == data.group_id,
            MlModel.training_status.in_(training.statuses.active),
        )
    )
    if active.scalar_one_or_none():
        logger.error("Тренировка уже запущена")
        raise ConflictError("Тренировка уже запущена")

    train_data = await load_training_data(db, data.group_id)
    validate_training_data(train_data)

    version = await _next_version(db, data.group_id)
    base_weights = training.architecture.base_weights[data.architecture]
    if not (STORAGE_PATH / "models" / "_basic" / base_weights).is_file():
        logger.error("Базовые веса не найдены: %s", base_weights)
        raise ValidationError(f"Базовые веса не найдены: {base_weights}")

    model = MlModel(
        group_id=data.group_id,
        name=f"{data.architecture}_v{version}",
        architecture=data.architecture,
        weights_path=f"models/_basic/{base_weights}",
        version=version,
        epochs=data.epochs,
        imgsz=data.imgsz,
        batch_size=data.batch_size,
        num_classes=len(train_data.class_names),
        class_names=train_data.class_names,
        train_ratio=data.train_ratio,
        val_ratio=data.val_ratio,
        test_ratio=100 - data.train_ratio - data.val_ratio,
        total_images=None,
        train_count=None,
        val_count=None,
        test_count=None,
        training_status=training.statuses.default,
    )
    db.add(model)
    await db.commit()
    await db.refresh(model)

    from tasks.training import execute_training

    await execute_training.defer_async(
        model_id=str(model.id),
        group_id=str(data.group_id),
        train_ratio=data.train_ratio,
        val_ratio=data.val_ratio,
        epochs=data.epochs,
        imgsz=data.imgsz,
        batch_size=data.batch_size,
        weights_path=model.weights_path,
        version=version,
        lock=f"training:{data.group_id}",
    )

    return model
