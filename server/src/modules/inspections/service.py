from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from uuid import UUID

from app.config import settings
from app.exception import NotFoundError, ValidationError
from constants import inspections
from fastapi import UploadFile
from modules.inspections.models import InspectionResult
from modules.ml_models.models import MlModel
from modules.segments.models import Segment, SegmentAnnotation, SegmentGroup
from modules.standards.models import Standard, StandardImage
from modules.tasks.models import Task
from modules.tasks.service import create_task, update_task_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


@dataclass(slots=True)
class InspectionContext:
    standard: Standard
    reference_image: StandardImage
    selected_segments: list[Segment]
    annotation_by_segment_id: dict[UUID, SegmentAnnotation]
    model: MlModel


async def get_inspection(
    db: AsyncSession,
    inspection_id: UUID,
) -> InspectionResult:
    inspection = await db.get(InspectionResult, inspection_id)
    if not inspection:
        raise NotFoundError("Проверка", inspection_id)
    return inspection


async def load_inspection_context(
    db: AsyncSession,
    *,
    standard_id: UUID,
    selected_segment_ids: list[UUID],
) -> InspectionContext:
    if not selected_segment_ids:
        raise ValidationError("Нужно выбрать хотя бы один класс для проверки")

    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
            selectinload(Standard.segments).selectinload(Segment.segment_group),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
        )
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if not standard:
        raise NotFoundError("Эталон", standard_id)

    reference_image = next((img for img in standard.images if img.is_reference), None)
    if not reference_image:
        raise ValidationError("У эталона нет reference-изображения")

    annotation_by_segment_id = {
        ann.segment_id: ann for ann in reference_image.annotations if ann.points
    }

    standard_segments_by_id = {segment.id: segment for segment in standard.segments}
    missing_segment_ids = [
        segment_id
        for segment_id in selected_segment_ids
        if segment_id not in standard_segments_by_id
    ]
    if missing_segment_ids:
        raise ValidationError("Часть выбранных классов не принадлежит эталону")

    selected_segments = [
        standard_segments_by_id[segment_id] for segment_id in selected_segment_ids
    ]

    if not selected_segments:
        raise ValidationError("Нужно выбрать хотя бы один класс для проверки")

    result = await db.execute(
        select(MlModel)
        .where(
            MlModel.group_id == standard.group_id,
            MlModel.is_active.is_(True),
        )
        .limit(1)
    )
    model = result.scalar_one_or_none()
    if not model:
        raise ValidationError("Для группы нет активной модели")

    if not model.weights_path:
        raise ValidationError("У активной модели отсутствует путь к весам")

    return InspectionContext(
        standard=standard,
        reference_image=reference_image,
        selected_segments=selected_segments,
        annotation_by_segment_id=annotation_by_segment_id,
        model=model,
    )


def build_expected_counts_from_reference(
    *,
    selected_segments: list[Segment],
    annotation_by_segment_id: dict[UUID, SegmentAnnotation],
) -> list[dict]:
    items: list[dict] = []

    for segment in selected_segments:
        annotation = annotation_by_segment_id.get(segment.id)
        expected_count = (
            len(annotation.points) if annotation and annotation.points else 0
        )

        items.append(
            {
                "segment_id": segment.id,
                "segment_group_id": segment.segment_group_id,
                "name": segment.name,
                "expected_count": expected_count,
            }
        )

    return items


async def start_inspection(
    db: AsyncSession,
    *,
    standard_id: UUID,
    selected_segment_ids: list[UUID],
    camera_id: UUID | None,
    mode: str,
    serial_number: str | None,
    notes: str | None,
    image: UploadFile,
) -> Task:
    if mode not in inspections.modes:
        raise ValidationError("Некорректный режим проверки")

    context = await load_inspection_context(
        db,
        standard_id=standard_id,
        selected_segment_ids=selected_segment_ids,
    )

    suffix = Path(image.filename).suffix.lower() if image.filename else ".jpg"
    if suffix not in {".jpg", ".jpeg", ".png"}:
        suffix = ".jpg"

    task = await create_task(
        db,
        type="inspection_run",
        status="pending",
        queue="inspection",
        entity_type="standard",
        entity_id=context.standard.id,
        group_id=context.standard.group_id,
        payload={
            "standard_id": str(context.standard.id),
            "group_id": str(context.standard.group_id),
            "camera_id": str(camera_id) if camera_id else None,
            "mode": mode,
            "serial_number": serial_number,
            "notes": notes,
            "filename": image.filename,
            "content_type": image.content_type,
            "model_id": str(context.model.id),
            "weights_path": context.model.weights_path,
            "selected_segment_ids": [
                str(segment_id) for segment_id in selected_segment_ids
            ],
        },
    )

    relative_path = f"inspections/source/{task.id}{suffix}"
    absolute_path = settings.STORAGE_ROOT / relative_path
    absolute_path.parent.mkdir(parents=True, exist_ok=True)
    absolute_path.write_bytes(await image.read())

    task.payload = {
        **(task.payload or {}),
        "image_path": relative_path,
    }
    await db.commit()
    await db.refresh(task)

    from .jobs import execute_inspection

    job_id = await execute_inspection.configure(
        lock="inspection",
    ).defer_async(task_id=str(task.id))

    task = await update_task_status(
        db,
        task_id=task.id,
        status="queued",
        stage="В очереди",
        message="Проверка поставлена в очередь",
        external_job_id=str(job_id),
    )
    return task
