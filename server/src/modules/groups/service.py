from uuid import UUID

from app.exception import ConflictError, NotFoundError
from modules.ml_models.models import MlModel
from modules.segments.models import Segment, SegmentAnnotation, SegmentGroup
from modules.standards.models import Standard, StandardImage
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Group
from .schemas import (
    GroupActiveModelResponse,
    GroupCreate,
    GroupDetailResponse,
    GroupListItemResponse,
    GroupMutationResponse,
    GroupStandardResponse,
    GroupStatsResponse,
    GroupUpdate,
)


def _build_group_mutation_response(
    group: Group,
) -> GroupMutationResponse:
    return GroupMutationResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
    )


def _build_group_stats_response(
    row,
) -> GroupStatsResponse:
    return GroupStatsResponse(
        standards_count=row.standard_count or 0,
        images_count=row.image_count or 0,
        annotated_count=row.annotated_count or 0,
        polygons_count=row.polygons_count or 0,
        segment_groups_count=row.segment_groups_count or 0,
        segments_count=row.segment_count or 0,
        models_count=row.models_count or 0,
    )


def _build_group_standard_response(
    standard: Standard,
) -> GroupStandardResponse:
    reference_image = next(
        (image for image in standard.images if image.is_reference), None
    )
    annotated_images_count = sum(
        1 for image in standard.images if len(image.annotations) > 0
    )

    return GroupStandardResponse(
        id=standard.id,
        group_id=standard.group_id,
        name=standard.name,
        angle=standard.angle,
        is_active=standard.is_active,
        created_at=standard.created_at,
        reference_path=reference_image.image_path if reference_image else None,
        images_count=len(standard.images),
        annotated_images_count=annotated_images_count,
    )


async def _get_group(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", "group", group_id)
    return group


def _build_group_stats_query():
    polygons_count_subquery = (
        select(
            func.coalesce(func.sum(func.json_array_length(SegmentAnnotation.points)), 0)
        )
        .select_from(Standard)
        .join(StandardImage, StandardImage.standard_id == Standard.id)
        .join(SegmentAnnotation, SegmentAnnotation.image_id == StandardImage.id)
        .where(Standard.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    return (
        select(
            Group.id.label("id"),
            Group.name.label("name"),
            Group.description.label("description"),
            Group.created_at.label("created_at"),
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
    )


async def _get_group_standards(
    db: AsyncSession,
    group_id: UUID,
) -> list[GroupStandardResponse]:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
        )
        .where(Standard.group_id == group_id)
        .order_by(Standard.created_at.desc())
    )
    standards = result.scalars().all()
    return [_build_group_standard_response(standard) for standard in standards]


async def _get_active_model(
    db: AsyncSession,
    group_id: UUID,
) -> GroupActiveModelResponse | None:
    result = await db.execute(
        select(MlModel)
        .where(MlModel.group_id == group_id, MlModel.is_active.is_(True))
        .order_by(MlModel.version.desc(), MlModel.created_at.desc())
    )
    model = result.scalars().first()
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
        raise ConflictError(
            "Группа уже существует",
            details={
                "entity": "group",
                "entity_label": "Группа",
                "field": "name",
                "value": name,
            },
        )


async def get_groups(
    db: AsyncSession,
    search: str | None = None,
) -> list[GroupListItemResponse]:
    query = _build_group_stats_query().order_by(Group.created_at.desc())

    if search:
        trimmed = search.strip()
        if trimmed:
            query = query.where(func.lower(Group.name).contains(trimmed.lower()))

    rows = (await db.execute(query)).all()

    return [
        GroupListItemResponse(
            id=row.id,
            name=row.name,
            description=row.description,
            created_at=row.created_at,
            stats=_build_group_stats_response(row),
        )
        for row in rows
    ]


async def get_group(
    db: AsyncSession,
    group_id: UUID,
) -> GroupDetailResponse:
    group = await _get_group(db, group_id)
    stats_row = (
        await db.execute(_build_group_stats_query().where(Group.id == group_id))
    ).one_or_none()
    stats = (
        _build_group_stats_response(stats_row)
        if stats_row is not None
        else GroupStatsResponse()
    )
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


async def create_group(
    db: AsyncSession,
    data: GroupCreate,
) -> GroupMutationResponse:
    await _ensure_name_unique(db, data.name)
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return _build_group_mutation_response(group)


async def update_group(
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
    return _build_group_mutation_response(group)


async def delete_group(
    db: AsyncSession,
    group_id: UUID,
) -> None:
    group = await _get_group(db, group_id)
    await db.delete(group)
    await db.commit()
