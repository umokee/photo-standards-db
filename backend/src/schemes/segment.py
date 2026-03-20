from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Label = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]


class SegmentCreate(BaseModel):
    image_id: UUID
    segment_group_id: UUID | None = None
    label: Label
    points: list[list[float]]


class SegmentUpdate(BaseModel):
    segment_group_id: UUID | None = None
    label: Label | None = None
    points: list[list[float]] | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "SegmentUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class SegmentResponse(BaseModel):
    id: UUID
    image_id: UUID
    segment_group_id: UUID | None
    label: str
    points: list[list[float]]
    mask_path: str | None

    model_config = ConfigDict(from_attributes=True)
