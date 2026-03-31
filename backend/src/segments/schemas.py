from uuid import UUID

from _shared.schemas import Name, OptionalName, UpdateNotEmpty
from pydantic import BaseModel, ConfigDict, Field


class SegmentGroupCreate(BaseModel):
    standard_id: UUID
    name: Name
    hue: int = Field(210, ge=0, le=360)


class SegmentGroupUpdate(UpdateNotEmpty):
    name: OptionalName
    hue: int | None = Field(None, ge=0, le=360)


class SegmentGroupResponse(BaseModel):
    id: UUID
    standard_id: UUID
    name: str
    hue: int
    segment_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class SegmentCreate(BaseModel):
    standard_id: UUID
    segment_group_id: UUID | None = None
    name: Name


class SegmentUpdate(UpdateNotEmpty):
    segment_group_id: UUID | None = None
    name: OptionalName


class SegmentResponse(BaseModel):
    id: UUID
    segment_group_id: UUID | None
    name: str

    model_config = ConfigDict(from_attributes=True)


class SegmentWithPointsResponse(BaseModel):
    id: UUID
    segment_group_id: UUID | None
    name: str
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
