from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends, HTTPException
from models.segment import Segment
from schemes.segment import (
    SegmentBatchUpdate,
    SegmentCreate,
    SegmentResponse,
    SegmentUpdate,
)
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/segments", tags=["segments"])


@router.post("", response_model=SegmentResponse, status_code=201)
async def create_segment(
    data: SegmentCreate,
    db: AsyncSession = Depends(get_session),
):
    segment = Segment(**data.model_dump())
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    return segment


@router.put("/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    segment_id: UUID,
    data: SegmentUpdate,
    db: AsyncSession = Depends(get_session),
):
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(segment, key, value)

    await db.commit()
    await db.refresh(segment)
    return segment


@router.put("/batch", response_model=list[SegmentResponse])
async def batch_update_segment(
    data: SegmentBatchUpdate,
    db: AsyncSession = Depends(get_session),
):
    results = []
    for item in data.segments:
        segment = await db.get(Segment, item.id)
        if not segment:
            raise HTTPException(
                status_code=404,
                detail=f"Segment {item.id} not found",
            )
        segment.points = item.points
        results.append(segment)

    await db.commit()
    for seg in results:
        await db.refresh(seg)
    return results


@router.delete("/{segment_id}", status_code=204)
async def delete_segment(
    segment_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Segment not found")

    await db.delete(segment)
    await db.commit()
