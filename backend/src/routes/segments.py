from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends
from schemes.segment import (
    SegmentCreate,
    SegmentResponse,
    SegmentUpdate,
)
from services import standard_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/segments", tags=["segments"])


@router.post("", response_model=SegmentResponse, status_code=201)
async def create_segment(
    data: SegmentCreate,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.create_segment(db, data)


@router.put("/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    segment_id: UUID,
    data: SegmentUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.update_segment(db, segment_id, data)


@router.delete("/{segment_id}", status_code=204)
async def delete_segment(
    segment_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    await standard_service.delete_segment(db, segment_id)
