from uuid import UUID

from fastapi import HTTPException, UploadFile
from models.segment import Segment
from models.segment_group import SegmentGroup
from models.standard import Standard
from models.standard_image import StandardImage
from schemes.segment import SegmentCreate, SegmentUpdate
from schemes.segment_group import SegmentGroupCreate, SegmentGroupUpdate
from schemes.standard import StandardCreate, StandardUpdate
from services import file_service
from sqlalchemy import select
from sqlalchemy import update as sa_update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


async def get_detail(
    db: AsyncSession,
    standard_id: UUID,
) -> Standard:
    result = await db.execute(
        select(Standard)
        .options(
            selectinload(Standard.images).selectinload(StandardImage.segments),
            selectinload(Standard.segment_groups).selectinload(SegmentGroup.segments),
        )
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if not standard:
        raise HTTPException(status_code=404, detail="Эталон не найден")

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
        .options(selectinload(Standard.images))
        .where(Standard.id == standard_id)
    )
    return result.scalar_one()


async def update(
    db: AsyncSession,
    standard_id: UUID,
    data: StandardUpdate,
) -> Standard:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Эталон не найден")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(standard, key, value)

    await db.commit()

    result = await db.execute(
        select(Standard)
        .options(selectinload(Standard.images))
        .where(Standard.id == standard_id)
    )
    return result.scalar_one()


async def delete(
    db: AsyncSession,
    standard_id: UUID,
) -> None:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Эталон не найден")

    result = await db.execute(
        select(StandardImage).where(StandardImage.standard_id == standard_id)
    )
    for img in result.scalars().all():
        file_service.delete_file(img.image_path)

    await db.delete(standard)
    await db.commit()


async def upload_image(
    db: AsyncSession,
    standard_id: UUID,
    image: UploadFile,
    is_reference: bool,
) -> StandardImage:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Эталон не найден")

    standard_image = StandardImage(
        standard_id=standard_id,
        image_path="",
        is_reference=is_reference,
    )
    db.add(standard_image)
    await db.flush()
    standard_image_id = standard_image.id

    img_path = await file_service.save_upload(
        image, f"standards/{standard.id}", str(standard_image_id)
    )
    standard_image.image_path = img_path
    await db.commit()

    result = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.segments))
        .where(StandardImage.id == standard_image_id)
    )
    return result.scalar_one()


async def upload_images(
    db: AsyncSession,
    standard_id: UUID,
    images: list[UploadFile],
) -> list[StandardImage]:
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Эталон не найден")

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
        .options(selectinload(StandardImage.segments))
        .where(StandardImage.id.in_(img_ids))
    )
    return result.scalars().all()


async def set_reference(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    img = await db.get(StandardImage, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    await db.execute(
        sa_update(StandardImage)
        .where(StandardImage.standard_id == img.standard_id)
        .values(is_reference=False)
    )

    img.is_reference = True
    await db.commit()

    result = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.segments))
        .where(StandardImage.id == image_id)
    )
    return result.scalar_one()


async def get_image(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    img = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.segments))
        .where(StandardImage.id == image_id)
    )
    return img.scalar_one_or_none()


async def delete_image(
    db: AsyncSession,
    image_id: UUID,
) -> None:
    img = await db.get(StandardImage, image_id)
    if not img:
        raise HTTPException(status_code=404, detail="Фото не найдено")

    await file_service.delete_file(img.image_path)

    await db.delete(img)
    await db.commit()


async def create_segment(
    db: AsyncSession,
    data: SegmentCreate,
) -> Segment:
    segment = Segment(**data.model_dump())
    db.add(segment)
    await db.commit()
    await db.refresh(segment)
    return segment


async def update_segment(
    db: AsyncSession,
    segment_id: UUID,
    data: SegmentUpdate,
) -> Segment:
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Сегмент не найден")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(segment, key, value)

    await db.commit()
    await db.refresh(segment)
    return segment


async def delete_segment(
    db: AsyncSession,
    segment_id: UUID,
) -> None:
    segment = await db.get(Segment, segment_id)
    if not segment:
        raise HTTPException(status_code=404, detail="Сегмент не найден")

    await db.delete(segment)
    await db.commit()


async def create_segment_group(
    db: AsyncSession,
    data: SegmentGroupCreate,
) -> SegmentGroup:
    group = SegmentGroup(**data.model_dump())
    db.add(group)
    await db.flush()
    group_id = group.id
    await db.commit()

    result = await db.execute(
        select(SegmentGroup)
        .options(selectinload(SegmentGroup.segments))
        .where(SegmentGroup.id == group_id)
    )
    return result.scalar_one()


async def update_segment_group(
    db: AsyncSession,
    segment_group_id: UUID,
    data: SegmentGroupUpdate,
) -> SegmentGroup:
    group = await db.get(SegmentGroup, segment_group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Метка не найдена")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(group, key, value)

    await db.commit()

    result = await db.execute(
        select(SegmentGroup)
        .options(selectinload(SegmentGroup.segments))
        .where(SegmentGroup.id == segment_group_id)
    )
    return result.scalar_one()


async def delete_segment_group(
    db: AsyncSession,
    segment_group_id: UUID,
) -> None:
    group = await db.get(SegmentGroup, segment_group_id)
    if not group:
        raise HTTPException(status_code=404, detail="Метка не найдена")

    await db.delete(group)
    await db.commit()
