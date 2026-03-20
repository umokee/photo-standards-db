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
    order_index: int = 0


class SegmentGroupUpdate(BaseModel):
    name: Name | None = None
    hue: int | None = Field(None, ge=0, le=360)
    order_index: int | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "SegmentGroupUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class SegmentGroupResponse(BaseModel):
    id: UUID
    name: str
    hue: int
    order_index: int
    segment_count: int = 0

    model_config = ConfigDict(from_attributes=True)
