from __future__ import annotations

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
from modules.segments.models import SegmentAnnotation
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

# -------- Typed training payload --------


@dataclass(slots=True)
class TrainingAnnotation:
    segment_class_id: UUID
    class_key: str
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
    class_keys: list[str]  # порядок = class_index в YOLO
    class_meta: list[dict]  # [{"id", "key", "name", "index", "class_group_id"}, ...]
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


# -------- Loading --------


def _standard_load_options():
    return [
        selectinload(Standard.images)
        .selectinload(StandardImage.annotations)
        .selectinload(SegmentAnnotation.segment_class),
    ]


def _get_image_size(image_path: str) -> tuple[int, int]:
    abs_path = resolve_storage_path(image_path)
    with Image.open(abs_path) as image:
        return image.size


def _build_training_data(
    group: Group,
    standards: list[Standard],
) -> TrainingData:
    """
    Формирует структуру для обучения. Ключевое:
    - class_keys = [str(cls.id) ...] — этим именем YOLO будет знать класс.
      Стабильно относительно переименований.
    - Порядок классов — по алфавиту name, чтобы YOLO-индексы были
      предсказуемы между переобучениями (полезно для диффа метрик).
    """
    sorted_segment_classes = sorted(
        group.segment_classes,
        key=lambda item: item.name.lower(),
    )

    class_keys = [str(item.id) for item in sorted_segment_classes]
    class_index_by_id = {
        item.id: index for index, item in enumerate(sorted_segment_classes)
    }
    class_meta = [
        {
            "id": str(item.id),
            "key": str(item.id),
            "name": item.name,
            "index": index,
            "class_group_id": str(item.class_group_id)
            if item.class_group_id is not None
            else None,
        }
        for index, item in enumerate(sorted_segment_classes)
    ]

    training_standards: list[TrainingStandard] = []

    for std in standards:
        training_images: list[TrainingImage] = []

        for img in std.images:
            width, height = _get_image_size(img.image_path)

            annotations: list[TrainingAnnotation] = []
            for ann in img.annotations:
                if not ann.points:
                    continue
                if ann.segment_class is None:
                    continue
                if ann.segment_class.id not in class_index_by_id:
                    continue

                annotations.append(
                    TrainingAnnotation(
                        segment_class_id=ann.segment_class.id,
                        class_key=str(ann.segment_class.id),
                        class_index=class_index_by_id[ann.segment_class.id],
                        points=ann.points,
                    )
                )

            training_images.append(
                TrainingImage(
                    image_id=img.id,
                    image_path=img.image_path,
                    width=width,
                    height=height,
                    is_annotated=bool(annotations),
                    annotations=annotations,
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
        class_keys=class_keys,
        class_meta=class_meta,
        standards=training_standards,
    )


async def _load_group_with_segment_classes(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.segment_classes))
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise NotFoundError("Группа", group_id)
    return group


def _load_group_with_segment_classes_sync(
    db: Session,
    group_id: UUID,
) -> Group:
    result = db.execute(
        select(Group)
        .options(selectinload(Group.segment_classes))
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise NotFoundError("Группа", group_id)
    return group


async def load_training_data(
    db: AsyncSession,
    group_id: UUID,
) -> TrainingData:
    group = await _load_group_with_segment_classes(db, group_id)

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
    group = _load_group_with_segment_classes_sync(db, group_id)

    result = db.execute(
        select(Standard)
        .options(*_standard_load_options())
        .where(Standard.group_id == group.id)
    )
    standards = list(result.scalars().all())
    return _build_training_data(group, standards)


# -------- Validation & split --------


def validate_training_data(data: TrainingData) -> None:
    if not data.standards:
        raise ValidationError("Группа не содержит эталонов")
    if not data.class_keys:
        raise ValidationError("Группа не содержит классов")

    has_any_annotated_image = False
    for std in data.standards:
        if not std.images:
            raise ValidationError(f"У эталона «{std.standard_name}» нет фотографий")
        if not any(img.is_annotated for img in std.images):
            raise ValidationError(
                f"У эталона «{std.standard_name}» нет размеченных фотографий"
            )
        has_any_annotated_image = True

    if not has_any_annotated_image:
        raise ValidationError("Группа не содержит аннотаций")


def plan_dataset_split(
    data: TrainingData,
    train_ratio: int,
    val_ratio: int,
) -> TrainingSplitPlan:
    """
    Делит аннотированные изображения каждого эталона на train/val/test
    детерминированно по (group_id, standard_id, train_ratio, val_ratio).
    Каждый эталон получает свою долю отдельно, чтобы val не оказался целиком
    из одного эталона.
    """
    if train_ratio < 0 or val_ratio < 0:
        raise ValidationError("train и val не могут быть отрицательными")
    if train_ratio > training.train_ratio.max:
        raise ValidationError(f"train не может превышать {training.train_ratio.max}%")
    if val_ratio > training.val_ratio.max:
        raise ValidationError(f"val не может превышать {training.val_ratio.max}%")

    ratio_sum_max = min(training.ratio_sum_max, 100)
    if train_ratio + val_ratio > ratio_sum_max:
        raise ValidationError(f"Сумма train и val не может превышать {ratio_sum_max}%")

    seed = data.group_id.int ^ (train_ratio << 8) ^ (val_ratio << 16)
    train_ids: list[UUID] = []
    val_ids: list[UUID] = []
    test_ids: list[UUID] = []
    total = 0

    for std in data.standards:
        image_ids = [img.image_id for img in std.images if img.is_annotated]
        img_count = len(image_ids)

        if img_count == 0:
            continue
        if img_count < training.min_images_to_train:
            raise ValidationError(
                f"Минимум {training.min_images_to_train} размеченных фото на эталон "
                f"(«{std.standard_name}»: {img_count})"
            )

        randomizer = random.Random(seed ^ std.standard_id.int)  # noqa: S311
        randomizer.shuffle(image_ids)

        train_count = (
            max(1, int(img_count * train_ratio / 100)) if train_ratio > 0 else 0
        )
        val_count = max(1, int(img_count * val_ratio / 100)) if val_ratio > 0 else 0

        if train_count + val_count > img_count:
            raise ValidationError(
                f"«{std.standard_name}»: мало фото для split {train_ratio}/{val_ratio}%"
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


# -------- YOLO dataset build --------


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

    for split in ("train", "val", "test"):
        (dataset_root / "images" / split).mkdir(parents=True, exist_ok=True)
        (dataset_root / "labels" / split).mkdir(parents=True, exist_ok=True)

    img_map = {img.image_id: img for std in data.standards for img in std.images}

    for split, ids in (
        ("train", split_plan.train),
        ("val", split_plan.val),
        ("test", split_plan.test),
    ):
        for image_id in ids:
            img = img_map[image_id]
            img_src = resolve_storage_path(img.image_path)
            suffix = img_src.suffix or ".jpg"

            dest_img_path = dataset_root / "images" / split / f"{image_id}{suffix}"
            dest_lab_path = dataset_root / "labels" / split / f"{image_id}.txt"
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
                f"nc: {len(data.class_keys)}",
                f"names: {json.dumps(data.class_keys, ensure_ascii=False)}",
            ]
        ),
        encoding="utf-8",
    )

    return DatasetBuildResult(
        dataset_root=dataset_root,
        yaml_path=yaml_path,
    )


# -------- Start training --------


async def _next_version(db: AsyncSession, group_id: UUID) -> int:
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
    """
    Создаёт MlModel + Task, ставит Procrastinate-job.
    При ошибке постановки в очередь MlModel остаётся в БД, но задача помечена
    failed — чтобы пользователь видел, что обучение не запустилось.
    """
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
    except Exception as exc:
        # Постановка в очередь упала — модель создана, но её никто не обучит.
        # Оставляем MlModel в БД (пользователь увидит версию со статусом "не обучена"),
        # задачу помечаем failed — чтобы на UI была видна причина.
        await update_task_status(
            db,
            task_id=task.id,
            status="failed",
            stage="Ошибка постановки в очередь",
            message="Модель не была отправлена в очередь на обучение",
            error=str(exc),
        )
        raise

    task = await update_task_status(
        db,
        task_id=task.id,
        status="queued",
        stage="В очереди",
        message="Модель поставлена в очередь",
        external_job_id=str(job_id),
    )
    return task, model
