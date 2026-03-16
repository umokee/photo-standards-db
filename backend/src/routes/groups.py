from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends, HTTPException
from models.group import Group
from models.standard import Standard
from schemes.group import (
    GroupCreate,
    GroupDetailResponse,
    GroupResponse,
    GroupUpdate,
)
from schemes.standard import StandardShortResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Group).order_by(Group.id))
    return result.scalars().all()


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Group)
        .options(selectinload(Group.standards).selectinload(Standard.segments))
        .where(Group.id == group_id)
    )
    group = result.scalar_one_or_none()
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    standards = [
        StandardShortResponse(
            id=s.id,
            group_id=s.group_id,
            name=s.name,
            image_path=s.image_path,
            angle=s.angle,
            is_active=s.is_active,
            created_at=s.created_at,
            segment_count=len(s.segments),
        )
        for s in group.standards
    ]

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        standards=standards,
    )


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_session),
):
    group = Group(**data.model_dump())
    db.add(group)
    await db.commit()
    await db.refresh(group)
    return group


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdate,
    db: AsyncSession = Depends(get_session),
):
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    await db.commit()
    await db.refresh(group)
    return group


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    group = await db.get(Group, group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Group not found")

    await db.delete(group)
    await db.commit()
