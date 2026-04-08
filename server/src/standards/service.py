from uuid import UUID

from _shared import file_service
from exception import NotFoundError
from fastapi import UploadFile
from segments.models import Segment, SegmentGroup
from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Standard, StandardImage
from .schemas import (
    StandardCreate,
    StandardDetailResponse,
    StandardImageDetailResponse,
    StandardImageResponse,
    StandardMutationResponse,
    StandardSegmentGroupResponse,
    StandardSegmentResponse,
    StandardSegmentWithPointsResponse,
    StandardStatsResponse,
    StandardUpdate,
)


def _build_standard_mutation_response(
    standard: Standard,
) -> StandardMutationResponse:
    return StandardMutationResponse(
        id=standard.id,
        group_id=standard.group_id,
        name=standard.name,
        angle=standard.angle,
        is_active=standard.is_active,
        created_at=standard.created_at,
    )


def _build_standard_image_response(
    image: StandardImage,
) -> StandardImageResponse:
    return StandardImageResponse(
        id=image.id,
        standard_id=image.standard_id,
        image_path=image.image_path,
        is_reference=image.is_reference,
        annotation_count=len(image.annotations),
        created_at=image.created_at,
    )


def _build_standard_segment_response(
    segment: Segment,
) -> StandardSegmentResponse:
    return StandardSegmentResponse(
        id=segment.id,
        segment_group_id=segment.segment_group_id,
        name=segment.name,
    )


def _build_standard_segment_group_response(
    group: SegmentGroup,
) -> StandardSegmentGroupResponse:
    return StandardSegmentGroupResponse(
        id=group.id,
        standard_id=group.standard_id,
        name=group.name,
        hue=group.hue,
        segment_count=len(group.segments),
    )


def _build_standard_stats_response(
    standard: Standard,
) -> StandardStatsResponse:
    reference_image = next(
        (image for image in standard.images if image.is_reference), None
    )
    annotated_images_count = sum(
        1 for image in standard.images if len(image.annotations) > 0
    )

    return StandardStatsResponse(
        images_count=len(standard.images),
        annotated_images_count=annotated_images_count,
        unannotated_images_count=len(standard.images) - annotated_images_count,
        segments_count=len(standard.segments),
        segment_groups_count=len(standard.segment_groups),
        reference_image_id=reference_image.id if reference_image else None,
        reference_path=reference_image.image_path if reference_image else None,
    )


def _build_standard_detail_response(standard: Standard) -> StandardDetailResponse:
    images = sorted(
        standard.images,
        key=lambda image: (not image.is_reference, image.created_at),
    )
    segments = sorted(standard.segments, key=lambda segment: segment.name.lower())
    segment_groups = sorted(
        standard.segment_groups,
        key=lambda group: group.name.lower(),
    )

    return StandardDetailResponse(
        id=standard.id,
        group_id=standard.group_id,
        name=standard.name,
        angle=standard.angle,
        is_active=standard.is_active,
        created_at=standard.created_at,
        stats=_build_standard_stats_response(standard),
        images=[_build_standard_image_response(image) for image in images],
        segments=[_build_standard_segment_response(segment) for segment in segments],
        segment_groups=[
            _build_standard_segment_group_response(group) for group in segment_groups
        ],
    )


async def _get_standard(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise NotFoundError("Эталон", "standard", standard_id)
    return standard


async def _get_standard_with_relations(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
            selectinload(Standard.segments),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
        )
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if not standard:
        raise NotFoundError("Эталон", "standard", standard_id)
    return standard


async def _get_image(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    image = await db.get(StandardImage, image_id)
    if not image:
        raise NotFoundError("Фото", "standard_image", image_id)
    return image


async def _get_image_with_annotations(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    result = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.annotations))
        .where(StandardImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise NotFoundError("Фото", "standard_image", image_id)
    return image


async def get_detail(
    db: AsyncSession,
    standard_id: UUID,
) -> StandardDetailResponse:
    standard = await _get_standard_with_relations(db, standard_id)
    return _build_standard_detail_response(standard)


async def create(
    db: AsyncSession,
    data: StandardCreate,
) -> StandardMutationResponse:
    standard = Standard(**data.model_dump())
    db.add(standard)
    await db.commit()
    await db.refresh(standard)
    return _build_standard_mutation_response(standard)


async def update(
    db: AsyncSession,
    standard_id: UUID,
    data: StandardUpdate,
) -> StandardMutationResponse:
    standard = await _get_standard(db, standard_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(standard, key, value)

    await db.commit()
    await db.refresh(standard)
    return _build_standard_mutation_response(standard)


async def delete(
    db: AsyncSession,
    standard_id: UUID,
) -> None:
    standard = await _get_standard(db, standard_id)

    result = await db.execute(
        select(StandardImage).where(StandardImage.standard_id == standard_id)
    )
    for img in result.scalars().all():
        await file_service.delete_file(img.image_path)

    await db.delete(standard)
    await db.commit()


async def upload_images(
    db: AsyncSession,
    standard_id: UUID,
    images: list[UploadFile],
) -> list[StandardImageResponse]:
    standard = await _get_standard(db, standard_id)

    created_images: list[StandardImage] = []
    for upload in images:
        standard_image = StandardImage(
            standard_id=standard_id,
            image_path="",
            is_reference=False,
        )
        db.add(standard_image)
        await db.flush()

        image_path = await file_service.save_upload(
            upload,
            f"standards/{standard.id}",
            str(standard_image.id),
        )
        standard_image.image_path = image_path
        created_images.append(standard_image)

    image_ids = [image.id for image in created_images]
    await db.commit()

    result = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.annotations))
        .where(StandardImage.id.in_(image_ids))
    )
    images = result.scalars().all()
    return [_build_standard_image_response(image) for image in images]


async def set_reference(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImageResponse:
    image = await _get_image(db, image_id)

    await db.execute(
        sa_update(StandardImage)
        .where(StandardImage.standard_id == image.standard_id)
        .values(is_reference=False)
    )
    image.is_reference = True
    await db.commit()

    refreshed_image = await _get_image_with_annotations(db, image_id)
    return _build_standard_image_response(refreshed_image)


async def get_image(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImageDetailResponse:
    image = await _get_image_with_annotations(db, image_id)

    result = await db.execute(
        select(Segment)
        .where(Segment.standard_id == image.standard_id)
        .order_by(Segment.name)
    )
    segments = result.scalars().all()
    annotation_points_by_segment_id = {
        annotation.segment_id: annotation.points for annotation in image.annotations
    }

    return StandardImageDetailResponse(
        id=image.id,
        standard_id=image.standard_id,
        image_path=image.image_path,
        is_reference=image.is_reference,
        annotation_count=len(image.annotations),
        created_at=image.created_at,
        segments=[
            StandardSegmentWithPointsResponse(
                id=segment.id,
                segment_group_id=segment.segment_group_id,
                name=segment.name,
                points=annotation_points_by_segment_id.get(segment.id, []),
            )
            for segment in segments
        ],
    )


async def delete_image(
    db: AsyncSession,
    image_id: UUID,
) -> None:
    image = await _get_image(db, image_id)
    await file_service.delete_file(image.image_path)
    await db.delete(image)
    await db.commit()
