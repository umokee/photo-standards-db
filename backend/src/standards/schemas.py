from datetime import datetime
from enum import StrEnum
from uuid import UUID

from _shared.schemas import OptionalName, UpdateNotEmpty
from pydantic import BaseModel, ConfigDict


class Angle(StrEnum):
    front = "front"
    top = "top"
    left = "left"
    right = "right"
    back = "back"


class StandardCreate(BaseModel):
    group_id: UUID
    name: OptionalName = None
    angle: Angle | None = None


class StandardUpdate(UpdateNotEmpty):
    name: OptionalName = None
    angle: Angle | None = None
    is_active: bool | None = None


class StandardResponse(BaseModel):
    id: UUID
    name: str | None
    angle: Angle | None
    is_active: bool
    reference_path: str | None = None
    created_at: datetime
    image_count: int = 0
    annotated_count: int = 0
    segment_groups: list["SegmentGroupResponse"] = []

    model_config = ConfigDict(from_attributes=True)


class StandardDetailResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str | None
    angle: Angle | None
    is_active: bool
    created_at: datetime
    images: list["StandardImageResponse"] = []
    segments: list["SegmentResponse"] = []
    segment_groups: list["SegmentGroupResponse"] = []

    model_config = ConfigDict(from_attributes=True)


class StandardImageResponse(BaseModel):
    id: UUID
    image_path: str
    is_reference: bool
    created_at: datetime
    annotation_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class StandardImageDetailResponse(StandardImageResponse):
    segments: list["SegmentWithPointsResponse"]


from segments.schemas import (
    SegmentGroupResponse,
    SegmentResponse,
    SegmentWithPointsResponse,
)

StandardResponse.model_rebuild()
StandardDetailResponse.model_rebuild()
StandardImageDetailResponse.model_rebuild()
