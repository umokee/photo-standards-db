from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends
from schemes.segment_group import (
    SegmentGroupCreate,
    SegmentGroupResponse,
    SegmentGroupUpdate,
)
from services import standard_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/segment-groups", tags=["segment-groups"])


@router.post("", response_model=SegmentGroupResponse, status_code=201)
async def create_segment_group(
    data: SegmentGroupCreate,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.create_segment_group(db, data)


@router.put("/{group_id}", response_model=SegmentGroupResponse)
async def update_segment_group(
    group_id: UUID,
    data: SegmentGroupUpdate,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.update_segment_group(db, group_id, data)


@router.delete("/{group_id}", status_code=204)
async def delete_segment_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    await standard_service.delete_segment_group(db, group_id)
