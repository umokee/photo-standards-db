from uuid import UUID

from app.dependencies import DbSession
from fastapi import APIRouter

from . import service
from .schemas import (
    GroupActiveModelResponse,
    GroupCreate,
    GroupDetailResponse,
    GroupListItemResponse,
    GroupMutationResponse,
    GroupSegmentClassCategoryResponse,
    GroupSegmentClassResponse,
    GroupStandardResponse,
    GroupStatsResponse,
    GroupUpdate,
)

router = APIRouter(prefix="/groups", tags=["groups"])


def _build_group_stats_response(
    stats: service.GroupStatsData,
) -> GroupStatsResponse:
    return GroupStatsResponse(
        standards_count=stats.standards_count,
        images_count=stats.images_count,
        annotated_images_count=stats.annotated_images_count,
        polygons_count=stats.polygons_count,
        segment_class_groups_count=stats.segment_class_groups_count,
        segment_classes_count=stats.segment_classes_count,
        models_count=stats.models_count,
    )


def _build_group_standard_response(
    standard,
) -> GroupStandardResponse:
    reference_image = next(
        (image for image in standard.images if image.is_reference),
        None,
    )
    annotated_images_count = sum(
        1
        for image in standard.images
        if any(annotation.points for annotation in image.annotations)
    )

    return GroupStandardResponse(
        id=standard.id,
        group_id=standard.group_id,
        name=standard.name,
        angle=standard.angle,
        is_active=standard.is_active,
        created_at=standard.created_at,
        reference_path=reference_image.image_path if reference_image else None,
        images_count=len(standard.images),
        annotated_images_count=annotated_images_count,
    )


def _build_group_segment_class_response(
    segment_class,
) -> GroupSegmentClassResponse:
    return GroupSegmentClassResponse(
        id=segment_class.id,
        group_id=segment_class.group_id,
        class_group_id=segment_class.class_group_id,
        name=segment_class.name,
        hue=segment_class.hue,
    )


def _build_group_segment_class_category_response(
    category,
) -> GroupSegmentClassCategoryResponse:
    items = sorted(category.segment_classes, key=lambda item: item.name.lower())

    return GroupSegmentClassCategoryResponse(
        id=category.id,
        group_id=category.group_id,
        name=category.name,
        segment_classes=[_build_group_segment_class_response(item) for item in items],
    )


@router.get("", response_model=list[GroupListItemResponse])
async def get_groups(
    db: DbSession,
) -> list[GroupListItemResponse]:
    items = await service.get_groups(db)

    return [
        GroupListItemResponse(
            id=group.id,
            name=group.name,
            description=group.description,
            created_at=group.created_at,
            stats=_build_group_stats_response(stats),
        )
        for group, stats in items
    ]


@router.get("/{group_id}", response_model=GroupDetailResponse)
async def get_group(
    db: DbSession,
    group_id: UUID,
) -> GroupDetailResponse:
    (
        group,
        stats,
        standards,
        active_model,
        categories,
        ungrouped_classes,
    ) = await service.get_group(db, group_id)

    sorted_categories = sorted(categories, key=lambda item: item.name.lower())
    sorted_ungrouped = sorted(ungrouped_classes, key=lambda item: item.name.lower())

    return GroupDetailResponse(
        id=group.id,
        name=group.name,
        description=group.description,
        created_at=group.created_at,
        stats=_build_group_stats_response(stats),
        standards=[_build_group_standard_response(item) for item in standards],
        active_model=(
            GroupActiveModelResponse.model_validate(active_model)
            if active_model is not None
            else None
        ),
        segment_class_categories=[
            _build_group_segment_class_category_response(item)
            for item in sorted_categories
        ],
        ungrouped_segment_classes=[
            _build_group_segment_class_response(item) for item in sorted_ungrouped
        ],
    )


@router.post("", response_model=GroupMutationResponse, status_code=201)
async def create_group(
    db: DbSession,
    data: GroupCreate,
) -> GroupMutationResponse:
    group = await service.create_group(db, data)
    return GroupMutationResponse.model_validate(group)


@router.put("/{group_id}", response_model=GroupMutationResponse)
async def update_group(
    db: DbSession,
    group_id: UUID,
    data: GroupUpdate,
) -> GroupMutationResponse:
    group = await service.update_group(db, group_id, data)
    return GroupMutationResponse.model_validate(group)


@router.delete("/{group_id}", status_code=204)
async def delete_group(
    db: DbSession,
    group_id: UUID,
) -> None:
    await service.delete_group(db, group_id)
