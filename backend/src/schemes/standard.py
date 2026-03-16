from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

from .segment import SegmentResponse

Angle = Literal["front", "top", "left", "right", "back"]

Name = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]
ImagePath = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=500,
    ),
]


class StandardUpdate(BaseModel):
    name: Name = None
    angle: Angle | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "StandardUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class StandardShortResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str | None
    image_path: str
    angle: Angle | None
    is_active: bool
    created_at: datetime
    segment_count: int

    model_config = ConfigDict(from_attributes=True)


class StandardResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str | None
    image_path: str
    angle: Angle | None
    is_active: bool
    created_at: datetime
    segments: list[SegmentResponse]

    model_config = ConfigDict(from_attributes=True)
