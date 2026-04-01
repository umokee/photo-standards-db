from uuid import UUID

from exception import ConflictError, NotFoundError
from segments.models import SegmentGroup
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from standards.models import Standard, StandardImage

from .models import Group
from .schemas import GroupCreate, GroupUpdate


async def _get_group(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id, "не найдена")
    return group


async def _get_group_with_relations(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    result = await db.execute(
        select(Group)
        .options(
            selectinload(Group.standards)
            .selectinload(Standard.images)
            .selectinload(StandardImage.annotations),
            selectinload(Group.standards)
            .selectinload(Standard.segment_groups)
            .selectinload(SegmentGroup.segments),
            selectinload(Group.ml_models),
        )
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise NotFoundError("Группа", group_id, "не найдена")
    return group


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
) -> list[Group]:
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.standards).selectinload(Standard.images))
        .order_by(Group.id)
    )
    return result.scalars().all()


async def get_detail(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    return await _get_group_with_relations(db, group_id)


async def create(
    db: AsyncSession,
    data: GroupCreate,
) -> Group:
    await _ensure_name_unique(db, data.name)
    group = Group(**data.model_dump())
    db.add(group)
    await db.flush()
    group_id = group.id
    await db.commit()
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.standards).selectinload(Standard.images))
        .where(Group.id == group_id)
    )
    return result.scalar_one()


async def update(
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
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.standards).selectinload(Standard.images))
        .where(Group.id == group_id)
    )
    return result.scalar_one()


async def delete(
    db: AsyncSession,
    group_id: UUID,
) -> None:
    group = await _get_group(db, group_id)
    await db.delete(group)
    await db.commit()
