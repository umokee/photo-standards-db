from __future__ import annotations

from collections import defaultdict
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


@dataclass(slots=True)
class GroupDetail:
    group: Group
    stats: GroupStatsData
    standards: list[Standard]
    active_model: MlModel | None
    categories: list[SegmentClassGroup]
    ungrouped_classes: list[SegmentClass]


async def get_groups(
    db: AsyncSession,
) -> list[tuple[Group, GroupStatsData]]:
    result = await db.execute(select(Group).order_by(Group.created_at.desc()))
    groups = list(result.scalars().all())
    if not groups:
        return []

    stats = await _compute_group_stats(db, [g.id for g in groups])
    return [(g, stats.get(g.id, GroupStatsData())) for g in groups]


async def get_group(
    db: AsyncSession,
    group_id: UUID,
) -> GroupDetail:
    group = await _get_group(db, group_id)
    stats_map = await _compute_group_stats(db, [group_id])
    stats = stats_map.get(group_id, GroupStatsData())

    standards = await _get_group_standards(db, group_id)
    active_model = await _get_active_model(db, group_id)
    categories, ungrouped_classes = await _get_group_segment_classes(db, group_id)

    return GroupDetail(
        group=group,
        stats=stats,
        standards=standards,
        active_model=active_model,
        categories=categories,
        ungrouped_classes=ungrouped_classes,
    )


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

    if data.name is not None and data.name != group.name:
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


async def _compute_group_stats(
    db: AsyncSession, group_ids: list[UUID]
) -> dict[UUID, GroupStatsData]:
    if not group_ids:
        return {}

    stats: dict[UUID, GroupStatsData] = defaultdict(GroupStatsData)

    await _fill_direct_count(
        db,
        stats,
        group_ids,
        model=Standard,
        attr="standards_count",
    )
    await _fill_direct_count(
        db,
        stats,
        group_ids,
        model=SegmentClassGroup,
        attr="segment_class_groups_count",
    )
    await _fill_direct_count(
        db,
        stats,
        group_ids,
        model=SegmentClass,
        attr="segment_classes_count",
    )
    await _fill_direct_count(
        db,
        stats,
        group_ids,
        model=MlModel,
        attr="models_count",
    )

    images_rows = await db.execute(
        select(Standard.group_id, func.count(StandardImage.id))
        .select_from(Standard)
        .join(StandardImage, StandardImage.standard_id == Standard.id)
        .where(Standard.group_id.in_(group_ids))
        .group_by(Standard.group_id)
    )
    for gid, count in images_rows:
        stats[gid].images_count = int(count)

    ann_rows = await db.execute(
        select(
            Standard.group_id,
            func.count(distinct(StandardImage.id)).label("annotated"),
            func.count(SegmentAnnotation.id).label("polygons"),
        )
        .select_from(Standard)
        .join(StandardImage, StandardImage.standard_id == Standard.id)
        .join(SegmentAnnotation, SegmentAnnotation.image_id == StandardImage.id)
        .where(Standard.group_id.in_(group_ids))
        .group_by(Standard.group_id)
    )
    for gid, annotated, polygons in ann_rows:
        stats[gid].annotated_images_count = int(annotated)
        stats[gid].polygons_count = int(polygons)

    return dict(stats)


async def _fill_direct_count(
    db: AsyncSession,
    stats: dict[UUID, GroupStatsData],
    group_ids: list[UUID],
    *,
    model: type,
    attr: str,
) -> None:
    rows = await db.execute(
        select(model.group_id, func.count(model.id))
        .where(model.group_id.in_(group_ids))
        .group_by(model.group_id)
    )
    for gid, count in rows:
        setattr(stats[gid], attr, int(count))


async def _get_group_standards(db: AsyncSession, group_id: UUID) -> list[Standard]:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
        )
        .where(Standard.group_id == group_id)
        .order_by(Standard.created_at.desc())
    )
    return list(result.scalars().all())


async def _get_active_model(db: AsyncSession, group_id: UUID) -> MlModel | None:
    result = await db.execute(
        select(MlModel)
        .where(MlModel.group_id == group_id, MlModel.is_active.is_(True))
        .order_by(MlModel.version.desc(), MlModel.created_at.desc())
        .limit(1)
    )
    return result.scalars().first()


async def _get_group_segment_classes(
    db: AsyncSession, group_id: UUID
) -> tuple[list[SegmentClassGroup], list[SegmentClass]]:
    categories_result = await db.execute(
        select(SegmentClassGroup)
        .options(selectinload(SegmentClassGroup.segment_classes))
        .where(SegmentClassGroup.group_id == group_id)
        .order_by(SegmentClassGroup.name.asc())
    )
    categories = list(categories_result.scalars().all())

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


async def _get_group(db: AsyncSession, group_id: UUID) -> Group:
    group = await db.get(Group, group_id)
    if group is None:
        raise NotFoundError("Группа", group_id)
    return group


async def _ensure_name_unique(
    db: AsyncSession, name: str, *, exclude_id: UUID | None = None
) -> None:
    query = select(Group.id).where(Group.name == name)
    if exclude_id is not None:
        query = query.where(Group.id != exclude_id)

    if await db.scalar(query) is not None:
        raise ConflictError(
            "Группа уже существует",
            details={
                "entity": "group",
                "entity_label": "Группа",
                "field": "name",
                "value": name,
            },
        )
