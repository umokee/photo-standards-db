from uuid import UUID

from app.dependencies import DbSession
from app.exception import NotFoundError
from fastapi import APIRouter
from infra.ml import refiner_service
from infra.storage.file_storage import resolve_storage_path
from modules.standards.models import StandardImage

from . import service
from .models import SegmentClass, SegmentClassGroup
from .schemas import (
    AnnotationSave,
    RefineRequest,
    RefineResponse,
    SaveSegmentClassesRequest,
    SaveSegmentClassesResponse,
    SegmentClassCategoryResponse,
    SegmentClassResponse,
    SegmentClassWithPointsResponse,
)

router = APIRouter(prefix="/segment-classes", tags=["segment-classes"])


def _build_segment_class_response(
    segment_class: SegmentClass,
) -> SegmentClassResponse:
    return SegmentClassResponse.model_validate(segment_class)


def _build_category_response(
    category: SegmentClassGroup,
) -> SegmentClassCategoryResponse:
    items = sorted(category.segment_classes, key=lambda item: item.name.lower())
    return SegmentClassCategoryResponse(
        id=category.id,
        group_id=category.group_id,
        name=category.name,
        segment_classes=[_build_segment_class_response(item) for item in items],
    )


def _build_save_response(
    group_id: UUID,
    categories: list[SegmentClassGroup],
    ungrouped_classes: list[SegmentClass],
) -> SaveSegmentClassesResponse:
    sorted_categories = sorted(categories, key=lambda item: item.name.lower())
    sorted_ungrouped = sorted(ungrouped_classes, key=lambda item: item.name.lower())

    return SaveSegmentClassesResponse(
        group_id=group_id,
        categories=[_build_category_response(item) for item in sorted_categories],
        ungrouped_classes=[
            _build_segment_class_response(item) for item in sorted_ungrouped
        ],
    )


@router.get("/group/{group_id}", response_model=SaveSegmentClassesResponse)
async def list_segment_classes(
    db: DbSession,
    group_id: UUID,
) -> SaveSegmentClassesResponse:
    categories, ungrouped_classes = await service.list_segment_classes(db, group_id)
    return _build_save_response(group_id, categories, ungrouped_classes)


@router.put("/group/{group_id}", response_model=SaveSegmentClassesResponse)
async def save_segment_classes(
    db: DbSession,
    group_id: UUID,
    data: SaveSegmentClassesRequest,
) -> SaveSegmentClassesResponse:
    categories, ungrouped_classes = await service.save_segment_classes(
        db,
        group_id,
        data,
    )
    return _build_save_response(group_id, categories, ungrouped_classes)


@router.put(
    "/{segment_class_id}/annotations/{image_id}",
    response_model=SegmentClassWithPointsResponse,
)
async def save_annotation(
    db: DbSession,
    segment_class_id: UUID,
    image_id: UUID,
    data: AnnotationSave,
) -> SegmentClassWithPointsResponse:
    segment_class, points = await service.save_annotation(
        db,
        segment_class_id,
        image_id,
        data,
    )
    return SegmentClassWithPointsResponse(
        id=segment_class.id,
        group_id=segment_class.group_id,
        class_group_id=segment_class.class_group_id,
        name=segment_class.name,
        hue=segment_class.hue,
        points=points,
    )


@router.post("/refine", response_model=RefineResponse)
async def refine_segment(
    db: DbSession,
    data: RefineRequest,
) -> RefineResponse:
    image = await db.get(StandardImage, data.image_id)
    if not image:
        raise NotFoundError("Фото", data.image_id)

    image_path = resolve_storage_path(image.image_path)
    refined = refiner_service.refine_contour(
        image_path=str(image_path),
        points=[[point[0], point[1]] for point in data.points],
    )
    return RefineResponse(points=refined)
