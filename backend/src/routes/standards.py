from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends
from schemes.standard import (
    StandardCreate,
    StandardDetailResponse,
    StandardResponse,
    StandardUpdate,
)
from services import standard_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/standards", tags=["standards"])


@router.get("/{standard_id}", response_model=StandardDetailResponse)
async def get_standard(
    standard_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.get_detail(db, standard_id)


@router.post("", response_model=StandardResponse, status_code=201)
async def create_standard(
    data: StandardCreate,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.create(db, data)


@router.put("/{standard_id}", response_model=StandardResponse)
async def update_standard(
    standard_id: UUID,
    data: StandardUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.update(db, standard_id, data)


@router.delete("/{standard_id}", status_code=204)
async def delete_standard(
    standard_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    await standard_service.delete(db, standard_id)
