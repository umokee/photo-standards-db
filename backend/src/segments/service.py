from uuid import UUID

from exception import ConflictError, NotFoundError, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from backend.src.segments.models import Segment
from backend.src.segments.schemas import (
    AnnotationSave,
    SaveSegmentsRequest,
    SegmentCreate,
    SegmentGroupCreate,
    SegmentGroupUpdate,
    SegmentUpdate,
    SegmentWithPointsResponse,
)

from ..standards.models import Standard, StandardImage
from .models import SegmentAnnotation, SegmentGroup


async def create_segment(
    db: AsyncSession,
    data: SegmentCreate,
) -> Segment:
    existing = await db.scalar(
        select(Segment).where(
            Segment.standard_id == data.standard_id, Segment.label == data.label
        )
    )
    if existing:
        raise ConflictError(f"Сегмент <{data.label}> уже существует")

    segment = Segment(**data.model_dump())
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    return segment


async def update_segment(
    db: AsyncSession,
    segment_id: UUID,
    data: SegmentUpdate,
) -> Segment:
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise NotFoundError("Сегмент", segment_id)

    if data.label is not None:
        existing = await db.scalar(
            select(Segment).where(
                Segment.standard_id == segment.standard_id,
                Segment.label == data.label,
                Segment.id != segment_id,
            )
        )
        if existing:
            raise ConflictError(f"Сегмент <{data.label}> уже существует")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(segment, key, value)

    await db.commit()
    await db.refresh(segment)
    return segment


async def delete_segment(
    db: AsyncSession,
    segment_id: UUID,
) -> None:
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise NotFoundError("Сегмент", segment_id)

    await db.delete(segment)
    await db.commit()


async def save_annotation(
    db: AsyncSession,
    segment_id: UUID,
    image_id: UUID,
    data: AnnotationSave,
) -> SegmentWithPointsResponse:
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise NotFoundError("Сегмент", segment_id)

    image = await db.get(StandardImage, image_id)
    if not image:
        raise NotFoundError("Фото", image_id, "не найдено")

    if image.standard_id != segment.standard_id:
        raise ValidationError("Сегмент и фото принадлежат разным эталонам")

    result = await db.execute(
        select(SegmentAnnotation).where(
            SegmentAnnotation.segment_id == segment_id,
            SegmentAnnotation.image_id == image_id,
        )
    )
    annotation = result.scalar_one_or_none()

    if annotation:
        annotation.points = data.points
    else:
        annotation = SegmentAnnotation(
            segment_id=segment_id,
            image_id=image_id,
            points=data.points,
        )
        db.add(annotation)

    await db.commit()
    await db.refresh(segment)

    return SegmentWithPointsResponse(
        id=segment.id,
        segment_group_id=segment.segment_group_id,
        label=segment.label,
        points=data.points,
    )


async def create_segment_group(
    db: AsyncSession,
    data: SegmentGroupCreate,
) -> SegmentGroup:
    existing = await db.scalar(
        select(SegmentGroup).where(
            SegmentGroup.standard_id == data.standard_id, SegmentGroup.name == data.name
        )
    )
    if existing:
        raise ConflictError(f"Метка <{data.name}> уже существует")

    group = SegmentGroup(**data.model_dump())
    db.add(group)
    await db.flush()
    group_id = group.id
    await db.commit()

    result = await db.execute(
        select(SegmentGroup)
        .options(selectinload(SegmentGroup.segments))
        .where(SegmentGroup.id == group_id)
    )
    return result.scalar_one()


async def update_segment_group(
    db: AsyncSession,
    segment_group_id: UUID,
    data: SegmentGroupUpdate,
) -> SegmentGroup:
    group = await db.get(SegmentGroup, segment_group_id)
    if not group:
        raise NotFoundError("Метка", segment_group_id, "не найдена")

    if data.name is not None:
        existing = await db.scalar(
            select(SegmentGroup).where(
                SegmentGroup.standard_id == group.standard_id,
                SegmentGroup.name == data.name,
                SegmentGroup.id != segment_group_id,
            )
        )
        if existing:
            raise ConflictError(f"Метка <{data.name}> уже существует")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    await db.commit()

    result = await db.execute(
        select(SegmentGroup)
        .options(selectinload(SegmentGroup.segments))
        .where(SegmentGroup.id == segment_group_id)
    )
    return result.scalar_one()


async def delete_segment_group(
    db: AsyncSession,
    segment_group_id: UUID,
) -> None:
    group = await db.get(SegmentGroup, segment_group_id)
    if not group:
        raise NotFoundError("Метка", segment_group_id, "не найдена")

    await db.delete(group)
    await db.commit()


async def save_segments(
    db: AsyncSession,
    standard_id: UUID,
    data: SaveSegmentsRequest,
) -> Standard:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise NotFoundError("Эталон", standard_id)

    for seg_id in data.deleted_segment_ids:
        segment = await db.get(Segment, seg_id)
        if segment:
            await db.delete(segment)

    for group_id in data.deleted_group_ids:
        group = await db.get(SegmentGroup, group_id)
        if group:
            await db.delete(group)

    for group_item in data.groups:
        if group_item.id is None:
            group = SegmentGroup(
                standard_id=standard_id,
                name=group_item.name,
                hue=group_item.hue,
            )
            db.add(group)
            await db.flush()
        else:
            group = await db.get(SegmentGroup, group_item.id)
            if not group:
                raise NotFoundError("Метка", group_item.id, "не найдена")
            if group.standard_id != standard_id:
                raise ValidationError("Метка принадлежит другому эталону")
            group.name = group_item.name
            group.hue = group_item.hue

        for segment_item in group_item.segments:
            if segment_item.id is None:
                segment = Segment(
                    standard_id=standard_id,
                    segment_group_id=group.id,
                    label=segment_item.label,
                )
                db.add(segment)
            else:
                segment = await db.get(Segment, segment_item.id)
                if not segment:
                    raise NotFoundError("Сегмент", segment_item.id)
                if segment.standard_id != standard_id:
                    raise ValidationError("Сегмент принадлежит другому эталону")
                segment.segment_group_id = group.id
                segment.label = segment_item.label

    try:
        await db.commit()
    except IntegrityError as e:
        await db.rollback()
        if "segments_standard_id_segment_group_id_label_key" in str(e.orig):
            raise ConflictError(
                "Сегмент с таким названием уже существует в этой группе"
            ) from e
        raise e from e

    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
            selectinload(Standard.segments),
        )
        .where(Standard.id == standard_id)
    )
    return result.scalar_one()


