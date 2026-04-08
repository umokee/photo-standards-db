from uuid import UUID

from exception import ConflictError, NotFoundError, ValidationError
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from standards.models import Standard, StandardImage

from .models import Segment, SegmentAnnotation, SegmentGroup
from .schemas import (
    AnnotationSave,
    SaveSegmentsRequest,
    SaveSegmentsResponse,
    SegmentCreate,
    SegmentGroupCreate,
    SegmentGroupResponse,
    SegmentGroupUpdate,
    SegmentResponse,
    SegmentUpdate,
    SegmentWithPointsResponse,
)


def _build_segment_group_response(
    group: SegmentGroup,
) -> SegmentGroupResponse:
    return SegmentGroupResponse(
        id=group.id,
        standard_id=group.standard_id,
        name=group.name,
        hue=group.hue,
        segment_count=len(group.segments),
    )


def _build_segment_response(
    segment: Segment,
) -> SegmentResponse:
    return SegmentResponse(
        id=segment.id,
        standard_id=segment.standard_id,
        segment_group_id=segment.segment_group_id,
        name=segment.name,
    )


def _build_segment_with_points_response(
    segment: Segment,
    points: list[list[list[float]]],
) -> SegmentWithPointsResponse:
    return SegmentWithPointsResponse(
        id=segment.id,
        standard_id=segment.standard_id,
        segment_group_id=segment.segment_group_id,
        name=segment.name,
        points=points,
    )


def _build_save_segments_response(
    standard_id: UUID,
    groups: list[SegmentGroup],
) -> SaveSegmentsResponse:
    sorted_groups = sorted(groups, key=lambda group: group.name.lower())
    sorted_segments = sorted(
        [segment for group in sorted_groups for segment in group.segments],
        key=lambda segment: (segment.segment_group_id, segment.name.lower()),
    )

    return SaveSegmentsResponse(
        standard_id=standard_id,
        groups=[_build_segment_group_response(group) for group in sorted_groups],
        segments=[_build_segment_response(segment) for segment in sorted_segments],
    )


async def _get_standard(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise NotFoundError("Эталон", "standard", standard_id)
    return standard


async def _get_segment(
    db: AsyncSession,
    segment_id: UUID,
) -> Segment:
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise NotFoundError("Сегмент", "segment", segment_id)
    return segment


async def _get_segment_group(
    db: AsyncSession,
    segment_group_id: UUID,
) -> SegmentGroup:
    group = await db.get(SegmentGroup, segment_group_id)
    if not group:
        raise NotFoundError("Группа сегментов", "segment_group", segment_group_id)
    return group


async def _get_segment_group_with_segments(
    db: AsyncSession,
    segment_group_id: UUID,
) -> SegmentGroup:
    result = await db.execute(
        select(SegmentGroup)
        .options(selectinload(SegmentGroup.segments))
        .where(SegmentGroup.id == segment_group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise NotFoundError("Группа сегментов", "segment_group", segment_group_id)
    return group


async def _get_standard_image(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    image = await db.get(StandardImage, image_id)
    if not image:
        raise NotFoundError("Фото", "standard_image", image_id)
    return image


async def _get_standard_segment_tree(
    db: AsyncSession,
    standard_id: UUID,
) -> list[SegmentGroup]:
    result = await db.execute(
        select(SegmentGroup)
        .options(selectinload(SegmentGroup.segments))
        .where(SegmentGroup.standard_id == standard_id)
    )
    return result.scalars().all()


async def _ensure_segment_group_belongs_to_standard(
    group: SegmentGroup,
    standard_id: UUID,
) -> None:
    if group.standard_id != standard_id:
        raise ValidationError("Группа сегментов принадлежит другому эталону")


async def _ensure_segment_belongs_to_standard(
    segment: Segment,
    standard_id: UUID,
) -> None:
    if segment.standard_id != standard_id:
        raise ValidationError("Сегмент принадлежит другому эталону")


async def _ensure_segment_name_unique(
    db: AsyncSession,
    *,
    standard_id: UUID,
    segment_group_id: UUID,
    name: str,
    exclude_segment_id: UUID | None = None,
) -> None:
    query = select(Segment).where(
        Segment.standard_id == standard_id,
        Segment.segment_group_id == segment_group_id,
        Segment.name == name,
    )
    if exclude_segment_id is not None:
        query = query.where(Segment.id != exclude_segment_id)

    existing = await db.scalar(query)
    if existing:
        raise ConflictError(
            "Сегмент уже существует в этой группе",
            details={
                "entity": "segment",
                "entity_label": "Сегмент",
                "field": "name",
                "value": name,
                "standard_id": str(standard_id),
                "segment_group_id": str(segment_group_id),
            },
        )


async def _ensure_segment_group_name_unique(
    db: AsyncSession,
    *,
    standard_id: UUID,
    name: str,
    exclude_group_id: UUID | None = None,
) -> None:
    query = select(SegmentGroup).where(
        SegmentGroup.standard_id == standard_id,
        SegmentGroup.name == name,
    )
    if exclude_group_id is not None:
        query = query.where(SegmentGroup.id != exclude_group_id)

    existing = await db.scalar(query)
    if existing:
        raise ConflictError(
            "Группа сегментов уже существует",
            details={
                "entity": "segment_group",
                "entity_label": "Группа сегментов",
                "field": "name",
                "value": name,
                "standard_id": str(standard_id),
            },
        )


async def create_segment(
    db: AsyncSession,
    data: SegmentCreate,
) -> SegmentResponse:
    await _get_standard(db, data.standard_id)

    group = await _get_segment_group(db, data.segment_group_id)
    await _ensure_segment_group_belongs_to_standard(group, data.standard_id)

    await _ensure_segment_name_unique(
        db,
        standard_id=data.standard_id,
        segment_group_id=data.segment_group_id,
        name=data.name,
    )

    segment = Segment(**data.model_dump())
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    return _build_segment_response(segment)


async def update_segment(
    db: AsyncSession,
    segment_id: UUID,
    data: SegmentUpdate,
) -> SegmentResponse:
    segment = await _get_segment(db, segment_id)

    next_group_id = data.segment_group_id or segment.segment_group_id
    next_name = data.name or segment.name

    if data.segment_group_id is not None:
        group = await _get_segment_group(db, data.segment_group_id)
        await _ensure_segment_group_belongs_to_standard(group, segment.standard_id)

    if data.name is not None or data.segment_group_id is not None:
        await _ensure_segment_name_unique(
            db,
            standard_id=segment.standard_id,
            segment_group_id=next_group_id,
            name=next_name,
            exclude_segment_id=segment.id,
        )

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(segment, key, value)

    await db.commit()
    await db.refresh(segment)
    return _build_segment_response(segment)


async def delete_segment(
    db: AsyncSession,
    segment_id: UUID,
) -> None:
    segment = await _get_segment(db, segment_id)
    await db.delete(segment)
    await db.commit()


async def save_annotation(
    db: AsyncSession,
    segment_id: UUID,
    image_id: UUID,
    data: AnnotationSave,
) -> SegmentWithPointsResponse:
    segment = await _get_segment(db, segment_id)
    image = await _get_standard_image(db, image_id)

    if image.standard_id != segment.standard_id:
        raise ValidationError("Сегмент и фото принадлежат разным эталонам")

    result = await db.execute(
        select(SegmentAnnotation).where(
            SegmentAnnotation.segment_id == segment_id,
            SegmentAnnotation.image_id == image_id,
        )
    )
    annotation = result.scalar_one_or_none()

    if annotation is None:
        annotation = SegmentAnnotation(
            segment_id=segment_id,
            image_id=image_id,
            points=data.points,
        )
        db.add(annotation)
    else:
        annotation.points = data.points

    await db.commit()
    await db.refresh(segment)

    return _build_segment_with_points_response(segment, data.points)


async def create_segment_group(
    db: AsyncSession,
    data: SegmentGroupCreate,
) -> SegmentGroupResponse:
    await _get_standard(db, data.standard_id)
    await _ensure_segment_group_name_unique(
        db,
        standard_id=data.standard_id,
        name=data.name,
    )

    group = SegmentGroup(**data.model_dump())
    db.add(group)
    await db.commit()

    group = await _get_segment_group_with_segments(db, group.id)
    return _build_segment_group_response(group)


async def update_segment_group(
    db: AsyncSession,
    segment_group_id: UUID,
    data: SegmentGroupUpdate,
) -> SegmentGroupResponse:
    group = await _get_segment_group(db, segment_group_id)

    if data.name is not None:
        await _ensure_segment_group_name_unique(
            db,
            standard_id=group.standard_id,
            name=data.name,
            exclude_group_id=group.id,
        )

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    await db.commit()
    group = await _get_segment_group_with_segments(db, segment_group_id)
    return _build_segment_group_response(group)


async def delete_segment_group(
    db: AsyncSession,
    segment_group_id: UUID,
) -> None:
    group = await _get_segment_group(db, segment_group_id)
    await db.delete(group)
    await db.commit()


async def save_segments(
    db: AsyncSession,
    standard_id: UUID,
    data: SaveSegmentsRequest,
) -> SaveSegmentsResponse:
    await _get_standard(db, standard_id)

    for segment_id in data.deleted_segment_ids:
        segment = await db.get(Segment, segment_id)
        if segment is not None:
            await _ensure_segment_belongs_to_standard(segment, standard_id)
            await db.delete(segment)

    for group_id in data.deleted_group_ids:
        group = await db.get(SegmentGroup, group_id)
        if group is not None:
            await _ensure_segment_group_belongs_to_standard(group, standard_id)
            await db.delete(group)

    for group_item in data.groups:
        if group_item.id is None:
            await _ensure_segment_group_name_unique(
                db,
                standard_id=standard_id,
                name=group_item.name,
            )
            group = SegmentGroup(
                standard_id=standard_id,
                name=group_item.name,
                hue=group_item.hue,
            )
            db.add(group)
            await db.flush()
        else:
            group = await _get_segment_group(db, group_item.id)
            await _ensure_segment_group_belongs_to_standard(group, standard_id)

            if group.name != group_item.name:
                await _ensure_segment_group_name_unique(
                    db,
                    standard_id=standard_id,
                    name=group_item.name,
                    exclude_group_id=group.id,
                )

            group.name = group_item.name
            group.hue = group_item.hue

        for segment_item in group_item.segments:
            if segment_item.id is None:
                await _ensure_segment_name_unique(
                    db,
                    standard_id=standard_id,
                    segment_group_id=group.id,
                    name=segment_item.name,
                )
                db.add(
                    Segment(
                        standard_id=standard_id,
                        segment_group_id=group.id,
                        name=segment_item.name,
                    )
                )
            else:
                segment = await _get_segment(db, segment_item.id)
                await _ensure_segment_belongs_to_standard(segment, standard_id)

                if (
                    segment.name != segment_item.name
                    or segment.segment_group_id != group.id
                ):
                    await _ensure_segment_name_unique(
                        db,
                        standard_id=standard_id,
                        segment_group_id=group.id,
                        name=segment_item.name,
                        exclude_segment_id=segment.id,
                    )

                segment.segment_group_id = group.id
                segment.name = segment_item.name

    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise ConflictError(
            "Конфликт имен в группах сегментов или сегментах"
        ) from error

    groups = await _get_standard_segment_tree(db, standard_id)
    return _build_save_segments_response(standard_id, groups)
