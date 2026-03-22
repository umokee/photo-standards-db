from uuid import UUID

from config import STORAGE_PATH
from database import get_session
from fastapi import APIRouter, Depends, HTTPException
from models.standard_image import StandardImage
from schemes.segment import (
    AnnotationSave,
    RefineRequest,
    RefineResponse,
    SegmentCreate,
    SegmentResponse,
    SegmentUpdate,
    SegmentWithPointsResponse,
)
from services import refiner_service, standard_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/segments", tags=["segments"])


@router.post("/refine", response_model=RefineResponse)
async def refine_segment(
    data: RefineRequest,
    db: AsyncSession = Depends(get_session),
) -> dict:
    image = await db.get(StandardImage, data.image_id)
    if not image:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    image_path = str(STORAGE_PATH / image.image_path)

    points_dicts = [{"x": p[0], "y": p[1]} for p in data.points]
    refined = refiner_service.refine_contour(
        image_path=image_path,
        points=points_dicts,
        epsilon=data.epsilon,
        padding=data.padding,
    )
    return {"points": [[p["x"], p["y"]] for p in refined]}


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


@router.put(
    "/{segment_id}/annotations/{image_id}",
    response_model=SegmentWithPointsResponse,
)
async def save_annotation(
    segment_id: UUID,
    image_id: UUID,
    data: AnnotationSave,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.save_annotation(db, segment_id, image_id, data)


@router.delete("/{segment_id}", status_code=204)
async def delete_segment(
    segment_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    await standard_service.delete_segment(db, segment_id)
