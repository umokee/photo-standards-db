from dataclasses import dataclass
from uuid import UUID

from config import STORAGE_PATH
from exception import NotFoundError, ValidationError
from mls.models import MlModel
from segments.models import SegmentGroup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from standards.models import Standard, StandardImage
from ultralytics import YOLO

_model: dict[str, YOLO] = {}


@dataclass
class Detection:
    class_name: str
    confidence: float
    polygon: list[list[float]]
    bbox: list[float]


async def load_inspection_context(
    db: AsyncSession,
    standard_id: UUID,
) -> tuple[Standard, MlModel, StandardImage]:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
            selectinload(Standard.segments),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
        )
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if not standard:
        raise NotFoundError("Эталон", standard_id)

    reference_image = next(
        (image for image in standard.images if image.is_reference), None
    )
    if not reference_image:
        raise ValidationError("У эталона нет reference-фото")
    if not reference_image.annotations:
        raise ValidationError("Reference-фото не содержит аннотаций")

    result = await db.execute(
        select(MlModel).where(
            MlModel.group_id == standard.group_id, MlModel.is_active.is_(True)
        )
    )
    model = result.scalar_one_or_none()
    if not model:
        raise ValidationError("Для группы нет активной модели")

    weights_path = STORAGE_PATH / model.weights_path
    if not weights_path.exists():
        raise ValidationError(f"Файл весов не найден: {weights_path}")

    return standard, model, reference_image


def load_yolo_model(weights_path: str) -> YOLO:
    path = STORAGE_PATH / weights_path
    key = str(path)
    if key not in _model:
        _model[key] = YOLO(key)

    return _model[key]


async def run_inference(
    model: YOLO,
    image_path: str,
) -> list[Detection]:
    results = model.predict(
        source=image_path,
        conf=0.25,
        iou=0.5,
        imgsz=640,
        verbose=False,
    )

    result = results[0]
    detections = []

    if result.masks is None:
        return detections

    for i, mask in enumerate(result.masks):
        cls_id = int(result.boxes[i].cls)
        class_name = result.names[cls_id]
        confidence = float(result.boxes[i].conf)
        bbox = result.boxes[i].xyxy[0].tolist()
        polygon = mask.xy[0].tolist()

        detections.append(
            Detection(
                class_name=class_name,
                confidence=confidence,
                polygon=polygon,
                bbox=bbox,
            )
        )

    return detections
