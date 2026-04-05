from uuid import UUID

from exception import ConflictError, NotFoundError
from mls.models import MlModel
from segments.models import Segment, SegmentAnnotation, SegmentGroup
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from standards.models import Standard, StandardImage

from .models import Group
from .schemas import (
    GroupActiveModelResponse,
    GroupCreate,
    GroupDetailResponse,
    GroupListItemResponse,
    GroupMutationResponse,
    GroupStandardShortResponse,
    GroupStatsResponse,
    GroupUpdate,
)


async def _get_group(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id, "не найдена")
    return group


async def _get_group_stats(
    db: AsyncSession,
    group_id: UUID,
) -> GroupStatsResponse:
    polygons_count_query = (
        select(func.coalesce(func.sum(func.json_array_length(SegmentAnnotation.points)), 0))
        .select_from(Standard)
        .join(StandardImage, StandardImage.standard_id == Standard.id)
        .join(SegmentAnnotation, SegmentAnnotation.image_id == StandardImage.id)
        .where(Standard.group_id == group_id)
    )

    query = (
        select(
            func.count(distinct(Standard.id)).label("standard_count"),
            func.count(distinct(StandardImage.id)).label("image_count"),
            func.count(distinct(SegmentGroup.id)).label("segment_groups_count"),
            func.count(distinct(Segment.id)).label("segment_count"),
            func.count(distinct(SegmentAnnotation.id)).label("annotated_count"),
            polygons_count_query.scalar_subquery().label("polygons_count"),
            func.count(distinct(MlModel.id)).label("models_count"),
        )
        .select_from(Group)
        .outerjoin(Standard, Standard.group_id == Group.id)
        .outerjoin(StandardImage, StandardImage.standard_id == Standard.id)
        .outerjoin(SegmentGroup, SegmentGroup.standard_id == Standard.id)
        .outerjoin(Segment, Segment.standard_id == Standard.id)
        .outerjoin(SegmentAnnotation, SegmentAnnotation.image_id == StandardImage.id)
        .outerjoin(MlModel, MlModel.group_id == Group.id)
        .where(Group.id == group_id)
        .group_by(Group.id)
    )

    row = (await db.execute(query)).one_or_none()
    if row is None:
        return GroupStatsResponse()

    return GroupStatsResponse(
        standards_count=row.standard_count,
        images_count=row.image_count,
        segment_groups_count=row.segment_groups_count,
        segments_count=row.segment_count,
        annotated_count=row.annotated_count,
        polygons_count=row.polygons_count,
        models_count=row.models_count,
    )


async def _get_group_standards(
    db: AsyncSession,
    group_id: UUID,
) -> list[GroupStandardShortResponse]:
    query = (
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
        )
        .where(Standard.group_id == group_id)
        .order_by(Standard.created_at.desc())
    )

    standards = (await db.execute(query)).scalars().all()

    return [
        GroupStandardShortResponse(
            id=standard.id,
            group_id=standard.group_id,
            name=standard.name,
            angle=standard.angle,
            is_active=standard.is_active,
            image_count=standard.image_count,
            annotated_count=standard.annotated_count,
            reference_path=standard.reference_path,
            created_at=standard.created_at,
        )
        for standard in standards
    ]


async def _get_active_model(
    db: AsyncSession,
    group_id: UUID,
) -> GroupActiveModelResponse | None:
    query = (
        select(MlModel)
        .where(MlModel.group_id == group_id, MlModel.is_active.is_(True))
        .order_by(MlModel.version.desc(), MlModel.created_at.desc())
    )

    model = (await db.execute(query)).scalars().first()
    if not model:
        return None

    return GroupActiveModelResponse.model_validate(model)


async def _ensure_name_unique(
    db: AsyncSession,
    name: str,
    group_id: UUID | None = None,
) -> None:
    query = select(Group).where(Group.name == name)

    if group_id is not None:
        query = query.where(Group.id != group_id)

    existing = await db.scalar(query)
    if existing:
        raise ConflictError(f"Группа <{name}> уже существует")


async def get_groups(
    db: AsyncSession,
) -> list[GroupListItemResponse]:
    polygons_count_subquery = (
        select(func.coalesce(func.sum(func.json_array_length(SegmentAnnotation.points)), 0))
        .select_from(Standard)
        .join(StandardImage, StandardImage.standard_id == Standard.id)
        .join(SegmentAnnotation, SegmentAnnotation.image_id == StandardImage.id)
        .where(Standard.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    query = (
        select(
            Group.id,
            Group.name,
            Group.description,
            Group.created_at,
            func.count(distinct(Standard.id)).label("standard_count"),
            func.count(distinct(StandardImage.id)).label("image_count"),
            func.count(distinct(SegmentGroup.id)).label("segment_groups_count"),
            func.count(distinct(Segment.id)).label("segment_count"),
            func.count(distinct(SegmentAnnotation.id)).label("annotated_count"),
            polygons_count_subquery.label("polygons_count"),
            func.count(distinct(MlModel.id)).label("models_count"),
        )
        .select_from(Group)
        .outerjoin(Standard, Standard.group_id == Group.id)
        .outerjoin(StandardImage, StandardImage.standard_id == Standard.id)
        .outerjoin(SegmentGroup, SegmentGroup.standard_id == Standard.id)
        .outerjoin(Segment, Segment.standard_id == Standard.id)
        .outerjoin(SegmentAnnotation, SegmentAnnotation.image_id == StandardImage.id)
        .outerjoin(MlModel, MlModel.group_id == Group.id)
        .group_by(Group.id, Group.name, Group.description, Group.created_at)
        .order_by(Group.created_at.desc())
    )
    rows = (await db.execute(query)).all()
    return [
        GroupListItemResponse(
            id=row.id,
            name=row.name,
            description=row.description,
            created_at=row.created_at,
            stats=GroupStatsResponse(
                standards_count=row.standard_count,
                images_count=row.image_count,
                segment_groups_count=row.segment_groups_count,
                segments_count=row.segment_count,
                annotated_count=row.annotated_count,
                polygons_count=row.polygons_count,
                models_count=row.models_count,
            ),
        )
        for row in rows
    ]


async def get_detail(
    db: AsyncSession,
    group_id: UUID,
) -> GroupDetailResponse:
    group = await _get_group(db, group_id)
    stats = await _get_group_stats(db, group_id)
    standards = await _get_group_standards(db, group_id)
    active_model = await _get_active_model(db, group_id)

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        stats=stats,
        standards=standards,
        active_model=active_model,
    )


async def create(
    db: AsyncSession,
    data: GroupCreate,
) -> GroupMutationResponse:
    await _ensure_name_unique(db, data.name)
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return GroupMutationResponse.model_validate(group)


async def update(
    db: AsyncSession,
    group_id: UUID,
    data: GroupUpdate,
) -> GroupMutationResponse:
    group = await _get_group(db, group_id)
    if data.name is not None:
        await _ensure_name_unique(db, data.name, group_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    await db.commit()
    await db.refresh(group)
    return GroupMutationResponse.model_validate(group)


async def delete(
    db: AsyncSession,
    group_id: UUID,
) -> None:
    group = await _get_group(db, group_id)
    await db.delete(group)
    await db.commit()
