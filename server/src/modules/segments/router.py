from uuid import UUID

from app.dependencies import DbSession
from app.exception import NotFoundError
from fastapi import APIRouter
from infra.ml import refiner_service
from infra.storage.file_storage import resolve_storage_path
from modules.standards.models import StandardImage

from . import service
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
    db: DbSession,
    data: SegmentGroupCreate,
) -> SegmentGroupResponse:
    return await service.create_segment_group(db, data)


@segment_group_router.put("/{group_id}", response_model=SegmentGroupResponse)
async def update_segment_group(
    db: DbSession,
    group_id: UUID,
    data: SegmentGroupUpdate,
) -> SegmentGroupResponse:
    return await service.update_segment_group(db, group_id, data)


@segment_group_router.delete("/{group_id}", status_code=204)
async def delete_segment_group(
    db: DbSession,
    group_id: UUID,
) -> None:
    await service.delete_segment_group(db, group_id)


@segment_router.post("/refine", response_model=RefineResponse)
async def refine_segment(
    db: DbSession,
    data: RefineRequest,
) -> RefineResponse:
    image = await db.get(StandardImage, data.image_id)
    if not image:
        raise NotFoundError("Фото", data.image_id)

    image_path = resolve_storage_path(image.image_path)
    refined = refiner_service.refine_contour(
        image_path=image_path,
        points=[[point[0], point[1]] for point in data.points],
    )
    return RefineResponse(points=refined)


@segment_router.post("", response_model=SegmentResponse, status_code=201)
async def create_segment(
    db: DbSession,
    data: SegmentCreate,
) -> SegmentResponse:
    return await service.create_segment(db, data)


@segment_router.put("/{segment_id}", response_model=SegmentResponse)
async def update_segment(
    db: DbSession,
    segment_id: UUID,
    data: SegmentUpdate,
) -> SegmentResponse:
    return await service.update_segment(db, segment_id, data)


@segment_router.put(
    "/{segment_id}/annotations/{image_id}",
    response_model=SegmentWithPointsResponse,
)
async def save_annotation(
    db: DbSession,
    segment_id: UUID,
    image_id: UUID,
    data: AnnotationSave,
) -> SegmentWithPointsResponse:
    return await service.save_annotation(db, segment_id, image_id, data)


@segment_router.delete("/{segment_id}", status_code=204)
async def delete_segment(
    db: DbSession,
    segment_id: UUID,
) -> None:
    await service.delete_segment(db, segment_id)


@segment_router.put("/{standard_id}/segments", response_model=SaveSegmentsResponse)
async def save_segments(
    db: DbSession,
    standard_id: UUID,
    data: SaveSegmentsRequest,
) -> SaveSegmentsResponse:
    return await service.save_segments(db, standard_id, data)
