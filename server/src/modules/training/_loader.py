from __future__ import annotations

from dataclasses import dataclass
from uuid import UUID

from app.exception import NotFoundError
from infra.storage.file_storage import resolve_storage_path
from modules.groups.models import Group
from modules.segments.models import SegmentAnnotation
from modules.standards.models import Standard, StandardImage
from PIL import Image
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload


@dataclass(slots=True)
class TrainingAnnotation:
    segment_class_id: UUID
    class_key: str
    class_index: int
    points: list[list[list[float]]]


@dataclass(slots=True)
class TrainingImage:
    image_id: UUID
    image_path: str
    width: int
    height: int
    is_annotated: bool
    annotations: list[TrainingAnnotation]


@dataclass(slots=True)
class TrainingStandard:
    standard_id: UUID
    standard_name: str
    angle: str | None
    images: list[TrainingImage]


@dataclass(slots=True)
class TrainingData:
    group_id: UUID
    group_name: str
    class_keys: list[str]
    class_meta: list[dict]
    standards: list[TrainingStandard]


async def load_training_data(db: AsyncSession, group_id: UUID) -> TrainingData:
    group = await db.get(Group, group_id, options=[selectinload(Group.segment_classes)])
    if group is None:
        raise NotFoundError("Группа", group_id)

    stmt = (
        select(Standard)
        .options(
            selectinload(Standard.images)
            .selectinload(StandardImage.annotations)
            .selectinload(SegmentAnnotation.segment_class),
        )
        .where(Standard.group_id == group_id)
        .order_by(Standard.created_at.asc())
    )
    standards = list((await db.execute(stmt)).scalars().all())
    return _build(group, standards)


def _build(group: Group, standards: list[Standard]) -> TrainingData:
    sorted_classes = sorted(group.segment_classes, key=lambda item: item.name.lower())
    class_index_by_id: dict[UUID, int] = {}
    class_meta: list[dict] = []
    for index, sc in enumerate(sorted_classes):
        class_index_by_id[sc.id] = index
        class_meta.append(
            {
                "id": str(sc.id),
                "key": sc.key,
                "name": sc.name,
                "index": index,
                "class_group_id": str(sc.class_group_id) if sc.class_group_id else None,
                "hue": sc.hue,
            }
        )

    standards_data: list[TrainingStandard] = []
    for standard in standards:
        images_data: list[TrainingImage] = []
        for image in standard.images:
            width, height = _image_size(image.image_path)
            anns: list[TrainingAnnotation] = []
            for ann in image.annotations:
                if not ann.points or ann.segment_class is None:
                    continue
                class_idx = class_index_by_id.get(ann.segment_class_id)
                if class_idx is None:
                    continue
                anns.append(
                    TrainingAnnotation(
                        segment_class_id=ann.segment_class_id,
                        class_key=ann.segment_class.key,
                        class_index=class_idx,
                        points=ann.points,
                    )
                )
            images_data.append(
                TrainingImage(
                    image_id=image.id,
                    image_path=image.image_path,
                    width=width,
                    height=height,
                    is_annotated=bool(anns),
                    annotations=anns,
                )
            )
        standards_data.append(
            TrainingStandard(
                standard_id=standard.id,
                standard_name=standard.name,
                angle=standard.angle,
                images=images_data,
            )
        )

    return TrainingData(
        group_id=group.id,
        group_name=group.name,
        class_keys=[m["key"] for m in class_meta],
        class_meta=class_meta,
        standards=standards_data,
    )


def _image_size(image_path: str) -> tuple[int, int]:
    with Image.open(resolve_storage_path(image_path)) as img:
        return img.size
