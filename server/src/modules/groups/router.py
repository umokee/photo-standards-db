from uuid import UUID

from app.dependencies import DbSession
from fastapi import APIRouter

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
    db: DbSession,
    search: str | None = None,
) -> list[GroupListItemResponse]:
    return await service.get_groups(db, search=search)


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    db: DbSession,
    group_id: UUID,
) -> GroupDetailResponse:
    return await service.get_group(db, group_id)


@router.post("", response_model=GroupMutationResponse, status_code=201)
async def create_group(
    db: DbSession,
    data: GroupCreate,
) -> GroupMutationResponse:
    return await service.create_group(db, data)


@router.put("/{group_id}", response_model=GroupMutationResponse)
async def update_group(
    db: DbSession,
    group_id: UUID,
    data: GroupUpdate,
) -> GroupMutationResponse:
    return await service.update_group(db, group_id, data)


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    db: DbSession,
    group_id: UUID,
) -> None:
    await service.delete_group(db, group_id)
