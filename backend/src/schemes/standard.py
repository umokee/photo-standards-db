from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Angle = Literal["front", "top", "left", "right", "back"]

Name = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


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


from .segment import SegmentResponse
from .segment_group import SegmentGroupResponse
from .standard_image import StandardImageResponse

StandardResponse.model_rebuild()
StandardDetailResponse.model_rebuild()
