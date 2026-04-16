from typing import Annotated
from uuid import UUID

from constants import segments
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

Name = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


class SegmentClassDraftItem(BaseModel):
    id: UUID | None = None
    name: Name
    hue: int = Field(
        segments.hue.default,
        ge=segments.hue.min,
        le=segments.hue.max,
    )


class SegmentClassCategoryDraftItem(BaseModel):
    id: UUID | None = None
    name: Name
    segment_classes: list[SegmentClassDraftItem] = Field(default_factory=list)


class SaveSegmentClassesRequest(BaseModel):
    categories: list[SegmentClassCategoryDraftItem] = Field(default_factory=list)
    ungrouped_classes: list[SegmentClassDraftItem] = Field(default_factory=list)
    deleted_category_ids: list[UUID] = Field(default_factory=list)
    deleted_class_ids: list[UUID] = Field(default_factory=list)


class SegmentClassResponse(BaseModel):
    id: UUID
    group_id: UUID
    class_group_id: UUID | None
    name: str
    hue: int

    model_config = ConfigDict(from_attributes=True)


class SegmentClassCategoryResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    segment_classes: list[SegmentClassResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class SaveSegmentClassesResponse(BaseModel):
    group_id: UUID
    categories: list[SegmentClassCategoryResponse] = Field(default_factory=list)
    ungrouped_classes: list[SegmentClassResponse] = Field(default_factory=list)


class SegmentClassWithPointsResponse(BaseModel):
    id: UUID
    group_id: UUID
    class_group_id: UUID | None
    name: str
    hue: int
    points: list[list[list[float]]]

    model_config = ConfigDict(from_attributes=True)


class AnnotationSave(BaseModel):
    points: list[list[list[float]]]


class RefineRequest(BaseModel):
    image_id: UUID
    points: list[list[float]]


class RefineResponse(BaseModel):
    points: list[list[float]]
