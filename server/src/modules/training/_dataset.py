from __future__ import annotations

import json
import os
import random
import shutil
from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from app.exception import ValidationError
from constants import training as training_constants
from infra.storage.file_storage import resolve_storage_path

from ._loader import TrainingAnnotation, TrainingData


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


def validate_training_data(data: TrainingData) -> None:
    if not data.standards:
        raise ValidationError("В группе нет эталонов")
    if not data.class_keys:
        raise ValidationError("В группе нет классов сегментов")

    total = sum(len(std.images) for std in data.standards)
    if total < training_constants.min_images_to_train:
        raise ValidationError(
            f"Для обучения нужно минимум {training_constants.min_images_to_train} изображения"
        )

    has_annotated = any(
        img.annotations
        for std in data.standards
        for img in std.images
        if img.is_annotated
    )
    if not has_annotated:
        raise ValidationError("Нет размеченных изображений для обучения")


def plan_dataset_split(
    data: TrainingData, *, train_ratio: int, val_ratio: int
) -> TrainingSplitPlan:
    _validate_ratios(train_ratio, val_ratio)

    seed = data.group_id.int ^ (train_ratio << 8) ^ (val_ratio << 16)
    train_ids: list[UUID] = []
    val_ids: list[UUID] = []
    test_ids: list[UUID] = []
    total = 0

    for std in data.standards:
        image_ids = [img.image_id for img in std.images if img.is_annotated]
        n = len(image_ids)
        if n == 0:
            continue
        if n < training_constants.min_images_to_train:
            raise ValidationError(
                f"Минимум {training_constants.min_images_to_train} размеченных фото на эталон "
                f"(«{std.standard_name}»: {n})"
            )

        rng = random.Random(seed ^ std.standard_id.int)  # noqa: S311
        rng.shuffle(image_ids)

        train_n = max(1, int(n * train_ratio / 100)) if train_ratio > 0 else 0
        val_n = max(1, int(n * val_ratio / 100)) if val_ratio > 0 else 0
        if train_n + val_n > n:
            raise ValidationError(
                f"«{std.standard_name}»: мало фото для split {train_ratio}/{val_ratio}%"
            )

        train_ids.extend(image_ids[:train_n])
        val_ids.extend(image_ids[train_n : train_n + val_n])
        test_ids.extend(image_ids[train_n + val_n :])
        total += n

    if not train_ids:
        raise ValidationError("Не удалось сформировать train split")
    if val_ratio > 0 and not val_ids:
        raise ValidationError("Не удалось сформировать val split")

    return TrainingSplitPlan(train_ids, val_ids, test_ids, total)


def build_temp_dataset(
    data: TrainingData, split: TrainingSplitPlan, *, dataset_root: Path
) -> DatasetBuildResult:
    if dataset_root.exists():
        shutil.rmtree(dataset_root, ignore_errors=True)

    for split_name in ("train", "val", "test"):
        (dataset_root / "images" / split_name).mkdir(parents=True, exist_ok=True)
        (dataset_root / "labels" / split_name).mkdir(parents=True, exist_ok=True)

    img_map = {img.image_id: img for std in data.standards for img in std.images}

    for split_name, ids in (
        ("train", split.train),
        ("val", split.val),
        ("test", split.test),
    ):
        for image_id in ids:
            img = img_map[image_id]
            _materialize_one(
                image_id=image_id,
                image_path=img.image_path,
                annotations=img.annotations,
                width=img.width,
                height=img.height,
                dataset_root=dataset_root,
                split_name=split_name,
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
    return DatasetBuildResult(dataset_root=dataset_root, yaml_path=yaml_path)


def _validate_ratios(train_ratio: int, val_ratio: int) -> None:
    if train_ratio < 0 or val_ratio < 0:
        raise ValidationError("train и val не могут быть отрицательными")
    if train_ratio > training_constants.train_ratio.max:
        raise ValidationError(
            f"train не может превышать {training_constants.train_ratio.max}%"
        )
    if val_ratio > training_constants.val_ratio.max:
        raise ValidationError(
            f"val не может превышать {training_constants.val_ratio.max}%"
        )
    cap = min(training_constants.ratio_sum_max, 100)
    if train_ratio + val_ratio > cap:
        raise ValidationError(f"Сумма train и val не может превышать {cap}%")


def _materialize_one(
    *,
    image_id: UUID,
    image_path: str,
    annotations: list[TrainingAnnotation],
    width: int,
    height: int,
    dataset_root: Path,
    split_name: str,
) -> None:
    src = resolve_storage_path(image_path)
    suffix = src.suffix or ".jpg"

    dst_img = dataset_root / "images" / split_name / f"{image_id}{suffix}"
    dst_lbl = dataset_root / "labels" / split_name / f"{image_id}.txt"

    try:
        os.symlink(src, dst_img)
    except OSError:
        shutil.copy2(src, dst_img)

    lines = _polygons_to_yolo(annotations, width, height)
    dst_lbl.write_text("\n".join(lines) + ("\n" if lines else ""), encoding="utf-8")


def _polygons_to_yolo(
    annotations: list[TrainingAnnotation], width: int, height: int
) -> list[str]:
    lines: list[str] = []
    for ann in annotations:
        if not ann.points:
            continue
        polygon = ann.points[0]
        normalized: list[str] = []
        for x, y in polygon:
            normalized.append(str(max(0, min(1, x / width))))
            normalized.append(str(max(0, min(1, y / height))))
        if normalized:
            lines.append(f"{ann.class_index} " + " ".join(normalized))
    return lines
