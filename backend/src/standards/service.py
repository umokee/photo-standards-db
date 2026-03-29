from uuid import UUID

from exception import NotFoundError
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .._shared import file_service
from ..segment_groups.models import SegmentGroup
from ..segments.models import Segment
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
            selectinload(Standard.segments),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
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
    img = await db.get(StandardImage, image_id)
    if not img:
        raise NotFoundError("Фото", image_id, "не найдено")
    return img


async def get_detail(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    standard = await _get_standard_with_relations(db, standard_id)
    standard.images.sort(key=lambda img: img.is_reference, reverse=True)
    return standard


async def create(
    db: AsyncSession,
    data: StandardCreate,
) -> Standard:
    standard = Standard(**data.model_dump())
    db.add(standard)
    await db.flush()
    standard_id = standard.id
    await db.commit()
    result = await db.execute(
        select(Standard)
        .options(selectinload(Standard.images), selectinload(Standard.segment_groups))
        .where(Standard.id == standard_id)
    )
    return result.scalar_one()


async def update(
    db: AsyncSession,
    standard_id: UUID,
    data: StandardUpdate,
) -> Standard:
    standard = await _get_standard(db, standard_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(standard, key, value)

    await db.commit()

    result = await db.execute(
        select(Standard)
        .options(selectinload(Standard.images), selectinload(Standard.segment_groups))
        .where(Standard.id == standard_id)
    )
    return result.scalar_one()


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
) -> list[StandardImage]:
    standard = await _get_standard(db, standard_id)

    results = []
    for image in images:
        standard_image = StandardImage(
            standard_id=standard_id,
            image_path="",
            is_reference=False,
        )
        db.add(standard_image)
        await db.flush()
        standard_image_id = standard_image.id

        img_path = await file_service.save_upload(
            image, f"standards/{standard.id}", str(standard_image_id)
        )
        standard_image.image_path = img_path
        results.append(standard_image)

    img_ids = [img.id for img in results]
    await db.commit()

    result = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.annotations))
        .where(StandardImage.id.in_(img_ids))
    )
    return result.scalars().all()


async def set_reference(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    img = await _get_image(db, image_id)
    await db.execute(
        sa_update(StandardImage)
        .where(StandardImage.standard_id == img.standard_id)
        .values(is_reference=False)
    )
    img.is_reference = True
    await db.commit()
    result = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.annotations))
        .where(StandardImage.id == image_id)
    )
    return result.scalar_one()


async def get_image(
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
        raise NotFoundError("Фото", image_id, "не найдено")

    result = await db.execute(
        select(Segment)
        .where(Segment.standard_id == image.standard_id)
        .order_by(Segment.label)
    )
    all_segments = result.scalars().all()
    ann_map = {a.segment_id: a.points for a in image.annotations}

    return {
        "id": image.id,
        "image_path": image.image_path,
        "is_reference": image.is_reference,
        "annotation_count": len(image.annotations),
        "created_at": image.created_at,
        "segments": [
            {
                "id": seg.id,
                "segment_group_id": seg.segment_group_id,
                "label": seg.label,
                "points": ann_map.get(seg.id, []),
            }
            for seg in all_segments
        ],
    }


async def delete_image(
    db: AsyncSession,
    image_id: UUID,
) -> None:
    img = await _get_image(db, image_id)
    await file_service.delete_file(img.image_path)
    await db.delete(img)
    await db.commit()
