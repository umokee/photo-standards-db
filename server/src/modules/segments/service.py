from __future__ import annotations

from uuid import UUID

from app.exception import ConflictError, NotFoundError, ValidationError
from modules.groups.models import Group
from modules.standards.models import StandardImage
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from .models import SegmentAnnotation, SegmentClass, SegmentClassGroup
from .schemas import AnnotationSave, SaveSegmentClassesRequest


def _norm(value: str) -> str:
    return value.strip().casefold()


def _validate_request_payload(
    data: SaveSegmentClassesRequest,
) -> None:
    seen_category_names: set[str] = set()
    seen_class_names: set[str] = set()

    for category in data.categories:
        category_name = _norm(category.name)
        if category_name in seen_category_names:
            raise ConflictError("Категории не должны дублироваться")
        seen_category_names.add(category_name)

        for item in category.segment_classes:
            class_name = _norm(item.name)
            if class_name in seen_class_names:
                raise ConflictError(
                    "Имена классов должны быть уникальны в пределах группы"
                )
            seen_class_names.add(class_name)

    for item in data.ungrouped_classes:
        class_name = _norm(item.name)
        if class_name in seen_class_names:
            raise ConflictError("Имена классов должны быть уникальны в пределах группы")
        seen_class_names.add(class_name)


async def _get_group(
    db: AsyncSession,
    group_id: UUID,
) -> Group:
    group = await db.get(Group, group_id)
    if not group:
        raise NotFoundError("Группа", group_id)
    return group


async def _get_segment_class(
    db: AsyncSession,
    segment_class_id: UUID,
) -> SegmentClass:
    segment_class = await db.get(SegmentClass, segment_class_id)
    if not segment_class:
        raise NotFoundError("Класс", segment_class_id)
    return segment_class


async def _get_category(
    db: AsyncSession,
    category_id: UUID,
) -> SegmentClassGroup:
    category = await db.get(SegmentClassGroup, category_id)
    if not category:
        raise NotFoundError("Категория", category_id)
    return category


async def _get_standard_image_with_standard(
    db: AsyncSession,
    image_id: UUID,
) -> StandardImage:
    result = await db.execute(
        select(StandardImage)
        .options(selectinload(StandardImage.standard))
        .where(StandardImage.id == image_id)
    )
    image = result.scalar_one_or_none()
    if not image:
        raise NotFoundError("Фото", image_id)
    return image


async def _get_group_tree(
    db: AsyncSession,
    group_id: UUID,
) -> tuple[list[SegmentClassGroup], list[SegmentClass]]:
    category_result = await db.execute(
        select(SegmentClassGroup)
        .options(selectinload(SegmentClassGroup.segment_classes))
        .where(SegmentClassGroup.group_id == group_id)
    )
    categories = list(category_result.scalars().all())

    ungrouped_result = await db.execute(
        select(SegmentClass)
        .where(
            SegmentClass.group_id == group_id,
            SegmentClass.class_group_id.is_(None),
        )
        .order_by(SegmentClass.name.asc())
    )
    ungrouped_classes = list(ungrouped_result.scalars().all())

    return categories, ungrouped_classes


async def _ensure_category_belongs_to_group(
    category: SegmentClassGroup,
    group_id: UUID,
) -> None:
    if category.group_id != group_id:
        raise ValidationError("Категория принадлежит другой группе изделия")


async def _ensure_segment_class_belongs_to_group(
    segment_class: SegmentClass,
    group_id: UUID,
) -> None:
    if segment_class.group_id != group_id:
        raise ValidationError("Класс принадлежит другой группе изделия")


async def _ensure_category_name_unique(
    db: AsyncSession,
    *,
    group_id: UUID,
    name: str,
    exclude_category_id: UUID | None = None,
) -> None:
    query = select(SegmentClassGroup).where(
        SegmentClassGroup.group_id == group_id,
        SegmentClassGroup.name == name,
    )
    if exclude_category_id is not None:
        query = query.where(SegmentClassGroup.id != exclude_category_id)

    existing = await db.scalar(query)
    if existing:
        raise ConflictError(
            "Категория уже существует",
            details={
                "entity": "segment_class_group",
                "field": "name",
                "value": name,
                "group_id": str(group_id),
            },
        )


async def _ensure_segment_class_name_unique(
    db: AsyncSession,
    *,
    group_id: UUID,
    name: str,
    exclude_segment_class_id: UUID | None = None,
) -> None:
    query = select(SegmentClass).where(
        SegmentClass.group_id == group_id,
        SegmentClass.name == name,
    )
    if exclude_segment_class_id is not None:
        query = query.where(SegmentClass.id != exclude_segment_class_id)

    existing = await db.scalar(query)
    if existing:
        raise ConflictError(
            "Класс уже существует в этой группе",
            details={
                "entity": "segment_class",
                "field": "name",
                "value": name,
                "group_id": str(group_id),
            },
        )


async def list_segment_classes(
    db: AsyncSession,
    group_id: UUID,
) -> tuple[list[SegmentClassGroup], list[SegmentClass]]:
    await _get_group(db, group_id)
    return await _get_group_tree(db, group_id)


async def save_annotation(
    db: AsyncSession,
    segment_class_id: UUID,
    image_id: UUID,
    data: AnnotationSave,
) -> tuple[SegmentClass, list[list[list[float]]]]:
    segment_class = await _get_segment_class(db, segment_class_id)
    image = await _get_standard_image_with_standard(db, image_id)

    if image.standard.group_id != segment_class.group_id:
        raise ValidationError("Класс и фото принадлежат разным группам изделия")

    result = await db.execute(
        select(SegmentAnnotation).where(
            SegmentAnnotation.segment_class_id == segment_class_id,
            SegmentAnnotation.image_id == image_id,
        )
    )
    annotation = result.scalar_one_or_none()

    if not data.points:
        if annotation is not None:
            await db.delete(annotation)
    elif annotation is None:
        annotation = SegmentAnnotation(
            segment_class_id=segment_class_id,
            image_id=image_id,
            points=data.points,
        )
        db.add(annotation)
    else:
        annotation.points = data.points

    await db.commit()
    await db.refresh(segment_class)

    return segment_class, data.points


async def save_segment_classes(
    db: AsyncSession,
    group_id: UUID,
    data: SaveSegmentClassesRequest,
) -> tuple[list[SegmentClassGroup], list[SegmentClass]]:
    await _get_group(db, group_id)
    _validate_request_payload(data)

    for class_id in data.deleted_class_ids:
        segment_class = await db.get(SegmentClass, class_id)
        if segment_class is not None:
            await _ensure_segment_class_belongs_to_group(segment_class, group_id)
            await db.delete(segment_class)

    for category_id in data.deleted_category_ids:
        category = await db.get(SegmentClassGroup, category_id)
        if category is not None:
            await _ensure_category_belongs_to_group(category, group_id)

            result = await db.execute(
                select(SegmentClass).where(SegmentClass.class_group_id == category.id)
            )
            attached_classes = list(result.scalars().all())
            for item in attached_classes:
                item.class_group_id = None

            await db.delete(category)

    for category_item in data.categories:
        if category_item.id is None:
            await _ensure_category_name_unique(
                db,
                group_id=group_id,
                name=category_item.name,
            )
            category = SegmentClassGroup(
                group_id=group_id,
                name=category_item.name,
            )
            db.add(category)
            await db.flush()
        else:
            category = await _get_category(db, category_item.id)
            await _ensure_category_belongs_to_group(category, group_id)

            if category.name != category_item.name:
                await _ensure_category_name_unique(
                    db,
                    group_id=group_id,
                    name=category_item.name,
                    exclude_category_id=category.id,
                )

            category.name = category_item.name

        for class_item in category_item.segment_classes:
            if class_item.id is None:
                await _ensure_segment_class_name_unique(
                    db,
                    group_id=group_id,
                    name=class_item.name,
                )
                db.add(
                    SegmentClass(
                        group_id=group_id,
                        class_group_id=category.id,
                        name=class_item.name,
                        hue=class_item.hue,
                    )
                )
            else:
                segment_class = await _get_segment_class(db, class_item.id)
                await _ensure_segment_class_belongs_to_group(segment_class, group_id)

                if segment_class.name != class_item.name:
                    await _ensure_segment_class_name_unique(
                        db,
                        group_id=group_id,
                        name=class_item.name,
                        exclude_segment_class_id=segment_class.id,
                    )

                segment_class.class_group_id = category.id
                segment_class.name = class_item.name
                segment_class.hue = class_item.hue

    for class_item in data.ungrouped_classes:
        if class_item.id is None:
            await _ensure_segment_class_name_unique(
                db,
                group_id=group_id,
                name=class_item.name,
            )
            db.add(
                SegmentClass(
                    group_id=group_id,
                    class_group_id=None,
                    name=class_item.name,
                    hue=class_item.hue,
                )
            )
        else:
            segment_class = await _get_segment_class(db, class_item.id)
            await _ensure_segment_class_belongs_to_group(segment_class, group_id)

            if segment_class.name != class_item.name:
                await _ensure_segment_class_name_unique(
                    db,
                    group_id=group_id,
                    name=class_item.name,
                    exclude_segment_class_id=segment_class.id,
                )

            segment_class.class_group_id = None
            segment_class.name = class_item.name
            segment_class.hue = class_item.hue

    try:
        await db.commit()
    except IntegrityError as error:
        await db.rollback()
        raise ConflictError("Конфликт имен в категориях или классах") from error

    return await _get_group_tree(db, group_id)
