from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends
from schemes.group import (
    GroupCreate,
    GroupDetailResponse,
    GroupResponse,
    GroupUpdate,
)
from services import group_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[GroupResponse])
async def list_groups(
    db: AsyncSession = Depends(get_session),
):
    return await group_service.get_groups(db)


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    return await group_service.get_detail(db, group_id)


@router.post("", response_model=GroupResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_session),
):
    return await group_service.create(db, data)


@router.put("/{group_id}", response_model=GroupResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await group_service.update(db, group_id, data)


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    await group_service.delete(db, group_id)
