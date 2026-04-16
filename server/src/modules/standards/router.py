from uuid import UUID

from app.dependencies import DbSession
from fastapi import APIRouter, File, UploadFile

from . import service
from .schemas import (
    StandardCreate,
    StandardDetailResponse,
    StandardImageDetailResponse,
    StandardImageResponse,
    StandardMutationResponse,
    StandardSegmentClassCategoryResponse,
    StandardSegmentClassResponse,
    StandardSegmentClassWithPointsResponse,
    StandardStatsResponse,
    StandardUpdate,
)

router = APIRouter(prefix="/standards", tags=["standards"])


def _build_standard_mutation_response(
    standard,
) -> StandardMutationResponse:
    return StandardMutationResponse.model_validate(standard)


def _build_standard_image_response(
    image,
) -> StandardImageResponse:
    annotation_count = sum(1 for annotation in image.annotations if annotation.points)

    return StandardImageResponse(
        id=image.id,
        standard_id=image.standard_id,
        image_path=image.image_path,
        is_reference=image.is_reference,
        annotation_count=annotation_count,
        created_at=image.created_at,
    )


def _build_standard_segment_class_response(
    segment_class,
) -> StandardSegmentClassResponse:
    return StandardSegmentClassResponse(
        id=segment_class.id,
        group_id=segment_class.group_id,
        class_group_id=segment_class.class_group_id,
        name=segment_class.name,
        hue=segment_class.hue,
    )


def _build_standard_segment_class_category_response(
    category,
) -> StandardSegmentClassCategoryResponse:
    items = sorted(category.segment_classes, key=lambda item: item.name.lower())

    return StandardSegmentClassCategoryResponse(
        id=category.id,
        group_id=category.group_id,
        name=category.name,
        segment_classes=[
            _build_standard_segment_class_response(item) for item in items
        ],
    )


def _build_standard_stats_response(
    standard,
) -> StandardStatsResponse:
    reference_image = next(
        (image for image in standard.images if image.is_reference),
        None,
    )
    annotated_images_count = sum(
        1
        for image in standard.images
        if any(annotation.points for annotation in image.annotations)
    )

    return StandardStatsResponse(
        images_count=len(standard.images),
        annotated_images_count=annotated_images_count,
        unannotated_images_count=len(standard.images) - annotated_images_count,
        segment_classes_count=len(standard.group.segment_classes),
        segment_class_categories_count=len(standard.group.segment_class_groups),
        reference_image_id=reference_image.id if reference_image else None,
        reference_path=reference_image.image_path if reference_image else None,
    )


def _build_standard_detail_response(
    standard,
) -> StandardDetailResponse:
    images = sorted(
        standard.images,
        key=lambda image: (not image.is_reference, image.created_at),
    )
    categories = sorted(
        standard.group.segment_class_groups,
        key=lambda item: item.name.lower(),
    )
    ungrouped_classes = sorted(
        [
            item
            for item in standard.group.segment_classes
            if item.class_group_id is None
        ],
        key=lambda item: item.name.lower(),
    )

    return StandardDetailResponse(
        id=standard.id,
        group_id=standard.group_id,
        name=standard.name,
        angle=standard.angle,
        is_active=standard.is_active,
        created_at=standard.created_at,
        stats=_build_standard_stats_response(standard),
        images=[_build_standard_image_response(item) for item in images],
        segment_class_categories=[
            _build_standard_segment_class_category_response(item) for item in categories
        ],
        ungrouped_segment_classes=[
            _build_standard_segment_class_response(item) for item in ungrouped_classes
        ],
    )


@router.get("/{standard_id}", response_model=StandardDetailResponse)
async def get_standard(
    db: DbSession,
    standard_id: UUID,
) -> StandardDetailResponse:
    standard = await service.get_detail(db, standard_id)
    return _build_standard_detail_response(standard)


@router.post("", response_model=StandardMutationResponse, status_code=201)
async def create_standard(
    db: DbSession,
    data: StandardCreate,
) -> StandardMutationResponse:
    standard = await service.create(db, data)
    return _build_standard_mutation_response(standard)


@router.put("/{standard_id}", response_model=StandardMutationResponse)
async def update_standard(
    db: DbSession,
    standard_id: UUID,
    data: StandardUpdate,
) -> StandardMutationResponse:
    standard = await service.update(db, standard_id, data)
    return _build_standard_mutation_response(standard)


@router.delete("/{standard_id}", status_code=204)
async def delete_standard(
    db: DbSession,
    standard_id: UUID,
) -> None:
    await service.delete(db, standard_id)


@router.post(
    "/{standard_id}/images",
    response_model=list[StandardImageResponse],
    status_code=201,
)
async def upload_images(
    db: DbSession,
    standard_id: UUID,
    images: list[UploadFile] = File(...),  # noqa: B008
) -> list[StandardImageResponse]:
    items = await service.upload_images(db, standard_id, images)
    return [_build_standard_image_response(item) for item in items]


@router.patch("/images/{image_id}/reference", response_model=StandardImageResponse)
async def set_reference(
    db: DbSession,
    image_id: UUID,
) -> StandardImageResponse:
    image = await service.set_reference(db, image_id)
    return _build_standard_image_response(image)


@router.get("/images/{image_id}", response_model=StandardImageDetailResponse)
async def get_image(
    db: DbSession,
    image_id: UUID,
) -> StandardImageDetailResponse:
    image, segment_classes, points_by_class_id = await service.get_image(db, image_id)

    annotation_count = sum(1 for annotation in image.annotations if annotation.points)

    return StandardImageDetailResponse(
        id=image.id,
        standard_id=image.standard_id,
        image_path=image.image_path,
        is_reference=image.is_reference,
        annotation_count=annotation_count,
        created_at=image.created_at,
        segment_classes=[
            StandardSegmentClassWithPointsResponse(
                id=item.id,
                group_id=item.group_id,
                class_group_id=item.class_group_id,
                name=item.name,
                hue=item.hue,
                points=points_by_class_id.get(item.id, []),
            )
            for item in segment_classes
        ],
    )


@router.delete("/images/{image_id}", status_code=204)
async def delete_image(
    db: DbSession,
    image_id: UUID,
) -> None:
    await service.delete_image(db, image_id)
