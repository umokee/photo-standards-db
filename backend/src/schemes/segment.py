from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Label = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


class SegmentCreate(BaseModel):
    standard_id: UUID
    segment_group_id: UUID | None = None
    label: Label


class SegmentUpdate(BaseModel):
    segment_group_id: UUID | None = None
    label: Label | None = None

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
    points: list[list[float]]

    model_config = ConfigDict(from_attributes=True)


class AnnotationSave(BaseModel):
    points: list[list[float]]


class RefineRequest(BaseModel):
    image_id: UUID
    points: list[list[float]]
    epsilon: float = 2.0
    padding: int = 50


class RefineResponse(BaseModel):
    points: list[list[float]]
