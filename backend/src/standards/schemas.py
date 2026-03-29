from datetime import datetime
from enum import StrEnum
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Name = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


class Angle(StrEnum):
    front = "front"
    top = "top"
    left = "left"
    right = "right"
    back = "back"


class StandardCreate(BaseModel):
    group_id: UUID
    name: Name = None
    angle: Angle | None = None


class StandardUpdate(BaseModel):
    name: Name = None
    angle: Angle | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "StandardUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class StandardResponse(BaseModel):
    id: UUID
    name: str | None
    angle: Angle | None
    is_active: bool
    image_count: int = 0
    annotated_count: int = 0
    image_path: str | None = None
    segment_groups: list["SegmentGroupResponse"] = []
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StandardDetailResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str | None
    angle: Angle | None
    is_active: bool
    created_at: datetime
    images: list["StandardImageResponse"]
    segments: list["SegmentResponse"]
    segment_groups: list["SegmentGroupResponse"]

    model_config = ConfigDict(from_attributes=True)


from ..segments.schemas import SegmentGroupResponse
from ..segments.schemas import SegmentResponse

StandardResponse.model_rebuild()
StandardDetailResponse.model_rebuild()


class StandardImageResponse(BaseModel):
    id: UUID
    image_path: str
    is_reference: bool
    annotation_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StandardImageDetailResponse(StandardImageResponse):
    segments: list["SegmentWithPointsResponse"]


from ..segments.schemas import SegmentWithPointsResponse

StandardImageDetailResponse.model_rebuild()
