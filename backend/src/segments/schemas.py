from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Name = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


class SegmentGroupCreate(BaseModel):
    standard_id: UUID
    name: Name
    hue: int = Field(210, ge=0, le=360)


class SegmentGroupUpdate(BaseModel):
    name: Name | None = None
    hue: int | None = Field(None, ge=0, le=360)

    @model_validator(mode="after")
    def check_not_empty(self) -> "SegmentGroupUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class SegmentGroupResponse(BaseModel):
    id: UUID
    name: str
    hue: int
    segment_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SegmentCreate(BaseModel):
    standard_id: UUID
    segment_group_id: UUID | None = None
    name: Name


class SegmentUpdate(BaseModel):
    segment_group_id: UUID | None = None
    label: Name | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "SegmentUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class SegmentResponse(BaseModel):
    id: UUID
    segment_group_id: UUID | None
    label: str

    model_config = ConfigDict(from_attributes=True)


class SegmentWithPointsResponse(BaseModel):
    id: UUID
    segment_group_id: UUID | None
    label: str
    points: list[list[list[float]]]

    model_config = ConfigDict(from_attributes=True)


class AnnotationSave(BaseModel):
    points: list[list[list[float]]]


class RefineRequest(BaseModel):
    image_id: UUID
    points: list[list[float]]
    epsilon: float = 2.0
    padding: int = 50


class RefineResponse(BaseModel):
    points: list[list[float]]


class SegmentItem(BaseModel):
    id: UUID | None = None
    name: Name


class SegmentGroupItem(BaseModel):
    id: UUID | None = None
    name: str
    hue: int
    segments: list[SegmentItem]


class SaveSegmentsRequest(BaseModel):
    groups: list[SegmentGroupItem]
    deleted_group_ids: list[UUID] = []
    deleted_segment_ids: list[UUID] = []
