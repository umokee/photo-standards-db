from uuid import UUID

from fastapi import HTTPException
from models.group import Group
from models.segment_group import SegmentGroup
from models.standard import Standard
from models.standard_image import StandardImage
from schemes.group import GroupCreate, GroupUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


async def get_groups(
    db: AsyncSession,
) -> list[Standard]:
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
        raise HTTPException(status_code=404, detail="Группа не найдена")

    group.active_model = next((m for m in group.ml_models if m.is_active), None)

    return group


async def create(
    db: AsyncSession,
    data: GroupCreate,
) -> Group:
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


async def update(
    db: AsyncSession,
    group_id: UUID,
    data: GroupUpdate,
) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    await db.commit()
    await db.refresh(group)
    return group


async def delete(
    db: AsyncSession,
    group_id: UUID,
) -> None:
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Группа не найдена")

    await db.delete(group)
    await db.commit()
