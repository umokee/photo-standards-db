from datetime import datetime
from typing import Annotated, Self
from uuid import UUID

from constants import standards
from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)

Name = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


class StandardSegmentResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    segment_group_id: UUID
    name: str


class StandardSegmentGroupResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    standard_id: UUID
    name: str
    hue: int
    segment_count: int = 0


class StandardStatsResponse(BaseModel):
    images_count: int = 0
    annotated_images_count: int = 0
    unannotated_images_count: int = 0
    segments_count: int = 0
    segment_groups_count: int = 0
    reference_image_id: UUID | None = None
    reference_path: str | None = None


class StandardImageResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    standard_id: UUID
    image_path: str
    is_reference: bool
    annotation_count: int = 0
    created_at: datetime


class StandardSegmentWithPointsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    segment_group_id: UUID
    name: str
    points: list[list[list[float]]]


class StandardImageDetailResponse(StandardImageResponse):
    segments: list[StandardSegmentWithPointsResponse] = Field(default_factory=list)


class StandardDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    name: str
    angle: str | None
    is_active: bool
    created_at: datetime
    stats: StandardStatsResponse
    images: list[StandardImageResponse] = Field(default_factory=list)
    segments: list[StandardSegmentResponse] = Field(default_factory=list)
    segment_groups: list[StandardSegmentGroupResponse] = Field(default_factory=list)


class StandardMutationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    name: str
    angle: str | None
    is_active: bool
    created_at: datetime


class StandardCreate(BaseModel):
    group_id: UUID
    name: Name
    angle: str | None = None

    @field_validator("angle")
    @classmethod
    def validate_angle(cls, val: str | None) -> str | None:
        if val is not None and val not in standards.angles:
            raise ValueError(
                f"Ракурс должен быть один из {', '.join(standards.angles)}"
            )
        return val


class StandardUpdate(BaseModel):
    name: Name | None = None
    angle: str | None = None
    is_active: bool | None = None

    @field_validator("angle")
    @classmethod
    def validate_angle(cls, val: str | None) -> str | None:
        if val is not None and val not in standards.angles:
            raise ValueError(
                f"Ракурс должен быть один из {', '.join(standards.angles)}"
            )
        return val

    @model_validator(mode="after")
    def validate_not_empty(self) -> Self:
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self
