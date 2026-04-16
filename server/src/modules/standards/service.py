from __future__ import annotations

from uuid import UUID

from app.exception import NotFoundError
from fastapi import UploadFile
from infra.storage import file_storage
from modules.groups.models import Group
from modules.segments.models import SegmentAnnotation, SegmentClass, SegmentClassGroup
from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import Standard, StandardImage
from .schemas import StandardCreate, StandardUpdate


async def _get_standard(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise NotFoundError("Эталон", standard_id)
    return standard


async def _get_standard_with_relations(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.annotations),
            selectinload(Standard.group)
            .selectinload(Group.segment_class_groups)
            .selectinload(SegmentClassGroup.segment_classes),
            selectinload(Standard.group).selectinload(Group.segment_classes),
        )
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if not standard:
        raise NotFoundError("Эталон", standard_id)
    return standard


async def _get_image(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    image = await db.get(StandardImage, image_id)
    if not image:
        raise NotFoundError("Фото", image_id)
    return image


async def _get_image_with_annotations(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    result = await db.execute(
        select(StandardImage)
        .options(
            selectinload(StandardImage.standard),
            selectinload(StandardImage.annotations).selectinload(
                SegmentAnnotation.segment_class
            ),
        )
        .where(StandardImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise NotFoundError("Фото", image_id)
    return image


async def get_detail(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    return await _get_standard_with_relations(db, standard_id)


async def create(
    db: AsyncSession,
    data: StandardCreate,
) -> Standard:
    standard = Standard(**data.model_dump())
    db.add(standard)
    await db.commit()
    await db.refresh(standard)
    return standard


async def update(
    db: AsyncSession,
    standard_id: UUID,
    data: StandardUpdate,
) -> Standard:
    standard = await _get_standard(db, standard_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(standard, key, value)

    await db.commit()
    await db.refresh(standard)
    return standard


async def delete(
    db: AsyncSession,
    standard_id: UUID,
) -> None:
    standard = await _get_standard(db, standard_id)

    result = await db.execute(
        select(StandardImage).where(StandardImage.standard_id == standard_id)
    )
    for img in result.scalars().all():
        await file_storage.delete_file(img.image_path)

    await db.delete(standard)
    await db.commit()


async def upload_images(
    db: AsyncSession,
    standard_id: UUID,
    images: list[UploadFile],
) -> list[StandardImage]:
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

        image_path = await file_storage.save_upload(
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
    return list(result.scalars().all())


async def set_reference(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    image = await _get_image(db, image_id)

    await db.execute(
        sa_update(StandardImage)
        .where(StandardImage.standard_id == image.standard_id)
        .values(is_reference=False)
    )
    image.is_reference = True
    await db.commit()

    return await _get_image_with_annotations(db, image_id)


async def get_image(
    db: AsyncSession,
    image_id: UUID,
) -> tuple[StandardImage, list[SegmentClass], dict[UUID, list[list[list[float]]]]]:
    image = await _get_image_with_annotations(db, image_id)

    result = await db.execute(
        select(SegmentClass)
        .where(SegmentClass.group_id == image.standard.group_id)
        .order_by(SegmentClass.name.asc())
    )
    segment_classes = list(result.scalars().all())

    annotation_points_by_class_id = {
        annotation.segment_class_id: annotation.points
        for annotation in image.annotations
        if annotation.points
    }

    return image, segment_classes, annotation_points_by_class_id


async def delete_image(
    db: AsyncSession,
    image_id: UUID,
) -> None:
    image = await _get_image(db, image_id)
    await file_storage.delete_file(image.image_path)
    await db.delete(image)
    await db.commit()
