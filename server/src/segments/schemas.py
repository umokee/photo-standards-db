from uuid import UUID

from _shared.constants import segments
from _shared.schemas import Name, UpdateNotEmpty
from pydantic import BaseModel, ConfigDict, Field


class SegmentGroupCreate(BaseModel):
    standard_id: UUID
    name: Name
    hue: int = Field(
        segments.hue.default,
        ge=segments.hue.min,
        le=segments.hue.max,
    )


class SegmentGroupUpdate(UpdateNotEmpty):
    name: Name | None = None
    hue: int | None = Field(
        None,
        ge=segments.hue.min,
        le=segments.hue.max,
    )


class SegmentGroupResponse(BaseModel):
    id: UUID
    standard_id: UUID
    name: str
    hue: int
    segment_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SegmentCreate(BaseModel):
    standard_id: UUID
    segment_group_id: UUID
    name: Name


class SegmentUpdate(UpdateNotEmpty):
    segment_group_id: UUID | None = None
    name: Name | None = None


class SegmentResponse(BaseModel):
    id: UUID
    standard_id: UUID
    segment_group_id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class SegmentWithPointsResponse(BaseModel):
    id: UUID
    standard_id: UUID
    segment_group_id: UUID
    name: str
    points: list[list[list[float]]]

    model_config = ConfigDict(from_attributes=True)


class AnnotationSave(BaseModel):
    points: list[list[list[float]]]


class RefineRequest(BaseModel):
    image_id: UUID
    points: list[list[float]]


class RefineResponse(BaseModel):
    points: list[list[float]]


class SegmentDraftItem(BaseModel):
    id: UUID | None = None
    name: Name


class SegmentGroupDraftItem(BaseModel):
    id: UUID | None = None
    name: Name
    hue: int = Field(ge=segments.hue.min, le=segments.hue.max)
    segments: list[SegmentDraftItem] = Field(default_factory=list)


class SaveSegmentsRequest(BaseModel):
    groups: list[SegmentGroupDraftItem] = Field(default_factory=list)
    deleted_group_ids: list[UUID] = Field(default_factory=list)
    deleted_segment_ids: list[UUID] = Field(default_factory=list)


class SaveSegmentsResponse(BaseModel):
    standard_id: UUID
    groups: list[SegmentGroupResponse] = Field(default_factory=list)
    segments: list[SegmentResponse] = Field(default_factory=list)
