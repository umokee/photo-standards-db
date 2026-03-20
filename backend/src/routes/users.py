from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends
from schemes.user import UserCreate, UserResponse, UserUpdate
from services import user_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_session),
):
    return await user_service.get_users(db)


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_session),
):
    return await user_service.create(db, data)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await user_service.update(db, user_id, data)


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    await user_service.delete(db, user_id)
