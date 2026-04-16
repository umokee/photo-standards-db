import json
import os
import random
import shutil
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from app.exception import NotFoundError, ValidationError
from constants import training
from infra.storage.file_storage import resolve_storage_path
from modules.groups.models import Group
from modules.ml_models.models import MlModel
from modules.segments.models import SegmentGroup
from modules.standards.models import Standard, StandardImage
from modules.tasks.service import (
    create_task,
    ensure_no_active_task_for_group,
    update_task_status,
)
from PIL import Image
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

from .schemas import TrainRequest


@dataclass(slots=True)
class TrainingAnnotation:
    segment_id: UUID
    class_name: str
    class_index: int
    points: list[list[list[float]]]


@dataclass(slots=True)
class TrainingImage:
    image_id: UUID
    image_path: str
    width: int
    height: int
    is_annotated: bool
    annotations: list[TrainingAnnotation]


@dataclass(slots=True)
class TrainingStandard:
    standard_id: UUID
    standard_name: str
    angle: str | None
    images: list[TrainingImage]


@dataclass(slots=True)
class TrainingData:
    group_id: UUID
    group_name: str
    class_names: list[str]
    standards: list[TrainingStandard]


@dataclass(slots=True)
class TrainingSplitPlan:
    train: list[UUID]
    val: list[UUID]
    test: list[UUID]
    total: int


@dataclass(slots=True)
class DatasetBuildResult:
    dataset_root: Path
    yaml_path: Path


def _standard_load_options():
    return [
        selectinload(Standard.images).selectinload(StandardImage.annotations),
        selectinload(Standard.segments),
        selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
    ]


def _get_image_size(image_path: str) -> tuple[int, int]:
    abs_path = resolve_storage_path(image_path)
    with Image.open(abs_path) as image:
        return image.size


def _build_training_data(
    group: Group,
    standards: list[Standard],
) -> TrainingData:
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
                            segment_id=ann.segment_id,
                            class_name=segment_class_map[ann.segment_id][1],
                            class_index=segment_class_map[ann.segment_id][0],
                            points=ann.points,
                        )
                        for ann in img.annotations
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
        raise NotFoundError("Группа", group_id)

    result = await db.execute(
        select(Standard)
        .options(*_standard_load_options())
        .where(Standard.group_id == group.id)
    )
    standards = list(result.scalars().all())
    return _build_training_data(group, standards)


def load_training_data_sync(
    db: Session,
    group_id: UUID,
) -> TrainingData:
    group = db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id)

    result = db.execute(
        select(Standard)
        .options(*_standard_load_options())
        .where(Standard.group_id == group.id)
    )
    standards = list(result.scalars().all())
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
    seed = hash((data.group_id, train_ratio, val_ratio))
    train_ids: set[UUID] = []
    val_ids: set[UUID] = []
    test_ids: set[UUID] = []
    total = 0

    ratio_sum_max = min(training.ratio_sum_max, 100)

    if train_ratio < 0 or val_ratio < 0:
        raise ValidationError("train и val не могут быть отрицательными")
    if train_ratio > training.train_ratio.max:
        raise ValidationError(f"train не может превышать {training.train_ratio.max}%")
    if val_ratio > training.val_ratio.max:
        raise ValidationError(f"val не может превышать {training.val_ratio.max}%")
    if train_ratio + val_ratio > ratio_sum_max:
        raise ValidationError(f"Сумма train и val не может превышать {ratio_sum_max}%")

    for std in data.standards:
        image_ids = [img.image_id for img in std.images if img.is_annotated]
        img_count = len(image_ids)

        if img_count == 0:
            continue
        if img_count < training.min_images_to_train:
            raise ValidationError(
                f"Минимум {training.min_images_to_train} размеченных фото на эталон"
            )

        randomizer = random.Random(seed ^ hash(std.standard_id))  # noqa: S311
        randomizer.shuffle(image_ids)

        train_count = (
            max(1, int(img_count * train_ratio / 100)) if train_ratio > 0 else 0
        )
        val_count = max(1, int(img_count * val_ratio / 100)) if val_ratio > 0 else 0

        if train_count + val_count > img_count:
            raise ValidationError(
                f"'{std.standard_name}': мало фото для split {train_ratio}/{val_ratio}%"
            )

        train_ids.extend(image_ids[:train_count])
        val_ids.extend(image_ids[train_count : train_count + val_count])
        test_ids.extend(image_ids[train_count + val_count :])
        total += img_count

    if not train_ids:
        raise ValidationError("Не удалось сформировать train split")
    if val_ratio > 0 and not val_ids:
        raise ValidationError("Не удалось сформировать val split")

    return TrainingSplitPlan(
        train=train_ids,
        val=val_ids,
        test=test_ids,
        total=total,
    )


def _normalize_polygon(
    polygon: list[list[float]],
    width: int,
    height: int,
) -> list[float]:
    normalized: list[float] = []

    for x, y in polygon:
        normalized.append(max(0.0, min(1.0, x / width)))
        normalized.append(max(0.0, min(1.0, y / height)))

    return normalized


def _build_yolo_lines(
    annotations: list[TrainingAnnotation],
    width: int,
    height: int,
) -> list[str]:
    lines: list[str] = []

    for ann in annotations:
        for polygon in ann.points:
            if len(polygon) < 3:
                continue

            coords = " ".join(
                f"{val:.6f}" for val in _normalize_polygon(polygon, width, height)
            )
            lines.append(f"{ann.class_index} {coords}")

    return lines


def build_temp_dataset(
    data: TrainingData,
    split_plan: TrainingSplitPlan,
) -> DatasetBuildResult:
    dataset_root = resolve_storage_path(Path("models") / str(data.group_id) / "temp")

    if dataset_root.exists():
        shutil.rmtree(dataset_root, ignore_errors=True)

    for split in ["train", "val", "test"]:
        (dataset_root / "images" / split).mkdir(parents=True, exist_ok=True)
        (dataset_root / "labels" / split).mkdir(parents=True, exist_ok=True)

    img_map = {img.image_id: img for std in data.standards for img in std.images}

    for split, ids in [
        ("train", split_plan.train),
        ("val", split_plan.val),
        ("test", split_plan.test),
    ]:
        for id in ids:
            img = img_map[id]
            img_src = resolve_storage_path(img.image_path)
            suffix = img_src.suffix or ".jpg"

            dest_img_path = dataset_root / "images" / split / f"{id}{suffix}"
            dest_lab_path = dataset_root / "labels" / split / f"{id}.txt"
            dest_img_path.parent.mkdir(parents=True, exist_ok=True)

            try:
                os.symlink(img_src, dest_img_path)
            except OSError:
                shutil.copy2(img_src, dest_img_path)

            lines = _build_yolo_lines(
                annotations=img.annotations,
                width=img.width,
                height=img.height,
            )
            dest_lab_path.write_text(
                "\n".join(lines) + ("\n" if lines else ""),
                encoding="utf-8",
            )

    yaml_path = dataset_root / "data.yaml"
    yaml_path.write_text(
        "\n".join(
            [
                f"path: {dataset_root}",
                "train: images/train",
                "val: images/val",
                "test: images/test",
                f"nc: {len(data.class_names)}",
                f"names: {json.dumps(data.class_names, ensure_ascii=False)}",
            ],
        ),
        encoding="utf-8",
    )

    return DatasetBuildResult(
        dataset_root=dataset_root,
        yaml_path=yaml_path,
    )


async def _next_version(
    db: AsyncSession,
    group_id: UUID,
) -> int:
    result = await db.execute(
        select(func.coalesce(func.max(MlModel.version), 0)).where(
            MlModel.group_id == group_id
        )
    )
    return int(result.scalar_one()) + 1


async def start_training(
    db: AsyncSession,
    data: TrainRequest,
):
    group = await db.get(Group, data.group_id)
    if not group:
        raise NotFoundError("Группа", data.group_id)

    await ensure_no_active_task_for_group(
        db,
        group_id=data.group_id,
        type="model_training",
    )

    base_weights = training.architectures.base_weights[data.architecture]
    base_weights_rel = (Path("models") / "_basic" / base_weights).as_posix()
    base_weights_abs = resolve_storage_path(base_weights_rel)
    if not base_weights_abs.is_file():
        raise ValidationError(f"Базовые веса не найдены: {base_weights}")

    version = await _next_version(db, data.group_id)

    model = MlModel(
        group_id=data.group_id,
        architecture=data.architecture,
        version=version,
        epochs=data.epochs,
        imgsz=data.imgsz,
        batch_size=data.batch_size,
        train_ratio=data.train_ratio,
        val_ratio=data.val_ratio,
        test_ratio=100 - data.train_ratio - data.val_ratio,
    )
    db.add(model)
    await db.flush()

    task = await create_task(
        db,
        type="model_training",
        status="pending",
        queue="training",
        payload={
            "model_id": str(model.id),
            "group_id": str(data.group_id),
            "version": version,
            "architecture": data.architecture,
            "epochs": data.epochs,
            "imgsz": data.imgsz,
            "batch_size": data.batch_size,
            "train_ratio": data.train_ratio,
            "val_ratio": data.val_ratio,
            "base_weights_path": base_weights_rel,
        },
        entity_type="ml_model",
        entity_id=model.id,
        group_id=data.group_id,
    )

    await db.refresh(model)

    from .jobs import execute_training

    try:
        job_id = await execute_training.configure(
            lock="training",
            queueing_lock=f"training:{data.group_id}",
        ).defer_async(task_id=str(task.id))
        task = await update_task_status(
            db,
            task_id=task.id,
            status="queued",
            stage="В очереди",
            message="Модель поставлена в очередь",
            external_job_id=str(job_id),
        )
    except Exception as e:
        task = await update_task_status(
            db,
            task_id=task.id,
            status="failed",
            stage="Ошибка постановки в очередь",
            error=str(e),
        )
        raise

    return task, model
