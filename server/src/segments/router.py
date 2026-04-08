from uuid import UUID

from config import STORAGE_PATH
from database import get_session
from exception import NotFoundError
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from standards.models import StandardImage

from . import refiner_service, service
from .schemas import (
    AnnotationSave,
    RefineRequest,
    RefineResponse,
    SaveSegmentsRequest,
    SaveSegmentsResponse,
    SegmentCreate,
    SegmentGroupCreate,
    SegmentGroupResponse,
    SegmentGroupUpdate,
    SegmentResponse,
    SegmentUpdate,
    SegmentWithPointsResponse,
)

segment_router = APIRouter(prefix="/segments", tags=["segments"])
segment_group_router = APIRouter(prefix="/segment-groups", tags=["segment-groups"])


@segment_group_router.post("", response_model=SegmentGroupResponse, status_code=201)
async def create_segment_group(
    data: SegmentGroupCreate,
    db: AsyncSession = Depends(get_session),
) -> SegmentGroupResponse:
    return await service.create_segment_group(db, data)


@segment_group_router.put("/{group_id}", response_model=SegmentGroupResponse)
async def update_segment_group(
    group_id: UUID,
    data: SegmentGroupUpdate,
    db: AsyncSession = Depends(get_session),
) -> SegmentGroupResponse:
    return await service.update_segment_group(db, group_id, data)


@segment_group_router.delete("/{group_id}", status_code=204)
async def delete_segment_group(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_segment_group(db, group_id)


@segment_router.post("/refine", response_model=RefineResponse)
async def refine_segment(
    data: RefineRequest,
    db: AsyncSession = Depends(get_session),
) -> RefineResponse:
    image = await db.get(StandardImage, data.image_id)
    if not image:
        raise NotFoundError("Фото", "standard_image", data.image_id)

    image_path = str(STORAGE_PATH / image.image_path)
    refined = refiner_service.refine_contour(
        image_path=image_path,
        points=[[point[0], point[1]] for point in data.points],
    )
    return RefineResponse(points=refined)


@segment_router.post("", response_model=SegmentResponse, status_code=201)
async def create_segment(
    data: SegmentCreate,
    db: AsyncSession = Depends(get_session),
) -> SegmentResponse:
    return await service.create_segment(db, data)


@segment_router.put("/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    segment_id: UUID,
    data: SegmentUpdate,
    db: AsyncSession = Depends(get_session),
) -> SegmentResponse:
    return await service.update_segment(db, segment_id, data)


@segment_router.put(
    "/{segment_id}/annotations/{image_id}",
    response_model=SegmentWithPointsResponse,
)
async def save_annotation(
    segment_id: UUID,
    image_id: UUID,
    data: AnnotationSave,
    db: AsyncSession = Depends(get_session),
) -> SegmentWithPointsResponse:
    return await service.save_annotation(db, segment_id, image_id, data)


@segment_router.delete("/{segment_id}", status_code=204)
async def delete_segment(
    segment_id: UUID,
    db: AsyncSession = Depends(get_session),
) -> None:
    await service.delete_segment(db, segment_id)


@segment_router.put("/{standard_id}/segments", response_model=SaveSegmentsResponse)
async def save_segments(
    standard_id: UUID,
    data: SaveSegmentsRequest,
    db: AsyncSession = Depends(get_session),
) -> SaveSegmentsResponse:
    return await service.save_segments(db, standard_id, data)
