from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from . import service
from .schemas import (
    GroupCreate,
    GroupDetailResponse,
    GroupListItemResponse,
    GroupMutationResponse,
    GroupUpdate,
)

router = APIRouter(prefix="/groups", tags=["groups"])


@router.get("", response_model=list[GroupListItemResponse])
async def get_groups(
    search: str | None = None,
    db: AsyncSession = Depends(get_session),
) -> list[GroupListItemResponse]:
    return await service.get_groups(db, search=search)


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
) -> GroupDetailResponse:
    return await service.get_group(db, group_id)


@router.post("", response_model=GroupMutationResponse, status_code=201)
async def create_group(
    data: GroupCreate,
    db: AsyncSession = Depends(get_session),
) -> GroupMutationResponse:
    return await service.create_group(db, data)


@router.put("/{group_id}", response_model=GroupMutationResponse)
async def update_group(
    group_id: UUID,
    data: GroupUpdate,
    db: AsyncSession = Depends(get_session),
) -> GroupMutationResponse:
    return await service.update_group(db, group_id, data)


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_group(db, group_id)
