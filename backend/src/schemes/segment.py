from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Label = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]
MaskPath = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=500,
    ),
]


class SegmentCreate(BaseModel):
    standard_id: UUID
    label: Label
    mask_path: MaskPath = None
    points: list[list[float]]
    confidence_threshold: float = Field(0.7, ge=0.0, le=1.0)
    is_critical: bool = True


class SegmentUpdate(BaseModel):
    label: Label | None = None
    mask_path: MaskPath = None
    points: list[list[float]] | None = None
    confidence_threshold: float | None = Field(None, ge=0.0, le=1.0)
    is_critical: bool | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "SegmentUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class SegmentBatchUpdateItem(BaseModel):
    id: UUID
    points: list[list[float]]


class SegmentBatchUpdate(BaseModel):
    segments: list[SegmentBatchUpdateItem]

    @model_validator(mode="after")
    def check_not_empty(self) -> "SegmentBatchUpdate":
        if not self.segments:
            raise ValueError("Список сегментов не может быть пустым")
        return self


class SegmentResponse(BaseModel):
    id: UUID
    label: str
    mask_path: str | None
    points: list[list[float]]
    confidence_threshold: float
    is_critical: bool

    model_config = ConfigDict(from_attributes=True)
