from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.exception import ConflictError, NotFoundError
from modules.groups.models import Group
from modules.ml_models.models import MlModel
from modules.segments.models import SegmentAnnotation, SegmentClass, SegmentClassGroup
from modules.standards.models import Standard, StandardImage
from sqlalchemy import distinct, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .schemas import GroupCreate, GroupUpdate


@dataclass(slots=True)
class GroupStatsData:
    standards_count: int = 0
    images_count: int = 0
    annotated_images_count: int = 0
    polygons_count: int = 0
    segment_class_groups_count: int = 0
    segment_classes_count: int = 0
    models_count: int = 0


async def _get_group(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id)
    return group


def _build_group_stats_stmt():
    standards_count_sq = (
        select(func.count(Standard.id))
        .where(Standard.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    images_count_sq = (
        select(func.count(StandardImage.id))
        .select_from(Standard)
        .join(StandardImage, StandardImage.standard_id == Standard.id)
        .where(Standard.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    annotated_images_count_sq = (
        select(func.count(distinct(StandardImage.id)))
        .select_from(Standard)
        .join(StandardImage, StandardImage.standard_id == Standard.id)
        .join(SegmentAnnotation, SegmentAnnotation.image_id == StandardImage.id)
        .where(Standard.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    polygons_count_sq = (
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

    class_groups_count_sq = (
        select(func.count(SegmentClassGroup.id))
        .where(SegmentClassGroup.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    classes_count_sq = (
        select(func.count(SegmentClass.id))
        .where(SegmentClass.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    models_count_sq = (
        select(func.count(MlModel.id))
        .where(MlModel.group_id == Group.id)
        .correlate(Group)
        .scalar_subquery()
    )

    return select(
        Group,
        standards_count_sq.label("standards_count"),
        images_count_sq.label("images_count"),
        annotated_images_count_sq.label("annotated_images_count"),
        polygons_count_sq.label("polygons_count"),
        class_groups_count_sq.label("segment_class_groups_count"),
        classes_count_sq.label("segment_classes_count"),
        models_count_sq.label("models_count"),
    )


def _row_to_group_stats(row) -> GroupStatsData:
    return GroupStatsData(
        standards_count=int(row.standards_count or 0),
        images_count=int(row.images_count or 0),
        annotated_images_count=int(row.annotated_images_count or 0),
        polygons_count=int(row.polygons_count or 0),
        segment_class_groups_count=int(row.segment_class_groups_count or 0),
        segment_classes_count=int(row.segment_classes_count or 0),
        models_count=int(row.models_count or 0),
    )


async def _get_group_standards(
    db: AsyncSession,
    group_id: UUID,
) -> list[Standard]:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
        )
        .where(Standard.group_id == group_id)
        .order_by(Standard.created_at.desc())
    )
    return list(result.scalars().all())


async def _get_active_model(
    db: AsyncSession,
    group_id: UUID,
) -> MlModel | None:
    result = await db.execute(
        select(MlModel)
        .where(MlModel.group_id == group_id, MlModel.is_active.is_(True))
        .order_by(MlModel.version.desc(), MlModel.created_at.desc())
    )
    return result.scalars().first()


async def _get_group_segment_classes(
    db: AsyncSession,
    group_id: UUID,
) -> tuple[list[SegmentClassGroup], list[SegmentClass]]:
    category_result = await db.execute(
        select(SegmentClassGroup)
        .options(selectinload(SegmentClassGroup.segment_classes))
        .where(SegmentClassGroup.group_id == group_id)
    )
    categories = list(category_result.scalars().all())

    ungrouped_result = await db.execute(
        select(SegmentClass)
        .where(
            SegmentClass.group_id == group_id,
            SegmentClass.class_group_id.is_(None),
        )
        .order_by(SegmentClass.name.asc())
    )
    ungrouped_classes = list(ungrouped_result.scalars().all())

    return categories, ungrouped_classes


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
) -> list[tuple[Group, GroupStatsData]]:
    stmt = _build_group_stats_stmt().order_by(Group.created_at.desc())
    rows = (await db.execute(stmt)).all()
    return [(row.Group, _row_to_group_stats(row)) for row in rows]


async def get_group(
    db: AsyncSession,
    group_id: UUID,
) -> tuple[
    Group,
    GroupStatsData,
    list[Standard],
    MlModel | None,
    list[SegmentClassGroup],
    list[SegmentClass],
]:
    group = await _get_group(db, group_id)

    row = (
        await db.execute(_build_group_stats_stmt().where(Group.id == group_id))
    ).one_or_none()
    stats = _row_to_group_stats(row) if row is not None else GroupStatsData()

    standards = await _get_group_standards(db, group_id)
    active_model = await _get_active_model(db, group_id)
    categories, ungrouped_classes = await _get_group_segment_classes(db, group_id)

    return group, stats, standards, active_model, categories, ungrouped_classes


async def create_group(
    db: AsyncSession,
    data: GroupCreate,
) -> Group:
    await _ensure_name_unique(db, data.name)
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


async def update_group(
    db: AsyncSession,
    group_id: UUID,
    data: GroupUpdate,
) -> Group:
    group = await _get_group(db, group_id)

    if data.name is not None:
        await _ensure_name_unique(db, data.name, group_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    await db.commit()
    await db.refresh(group)
    return group


async def delete_group(
    db: AsyncSession,
    group_id: UUID,
) -> None:
    group = await _get_group(db, group_id)
    await db.delete(group)
    await db.commit()
