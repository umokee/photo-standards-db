from datetime import datetime
from uuid import UUID

from _shared.constants import standards
from _shared.schemas import Name, UpdateNotEmpty
from pydantic import BaseModel, ConfigDict, Field, field_validator


class StandardSegmentResponse(BaseModel):
    id: UUID
    segment_group_id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class StandardSegmentGroupResponse(BaseModel):
    id: UUID
    standard_id: UUID
    name: str
    hue: int
    segment_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class StandardStatsResponse(BaseModel):
    images_count: int = 0
    annotated_images_count: int = 0
    unannotated_images_count: int = 0
    segments_count: int = 0
    segment_groups_count: int = 0
    reference_image_id: UUID | None = None
    reference_path: str | None = None


class StandardImageResponse(BaseModel):
    id: UUID
    standard_id: UUID
    image_path: str
    is_reference: bool
    annotation_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StandardSegmentWithPointsResponse(BaseModel):
    id: UUID
    segment_group_id: UUID
    name: str
    points: list[list[list[float]]]

    model_config = ConfigDict(from_attributes=True)


class StandardImageDetailResponse(StandardImageResponse):
    segments: list[StandardSegmentWithPointsResponse] = Field(default_factory=list)


class StandardDetailResponse(BaseModel):
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

    model_config = ConfigDict(from_attributes=True)


class StandardCreate(BaseModel):
    group_id: UUID
    name: Name
    angle: str | None = None

    @field_validator("angle")
    @classmethod
    def validate_angle(cls, val: str) -> str:
        if val not in standards.angles.all:
            raise ValueError(
                f"Ракурс должен быть один из {', '.join(standards.angles.all)}"
            )
        return val


class StandardUpdate(UpdateNotEmpty):
    name: Name | None = None
    angle: str | None = None
    is_active: bool | None = None

    @field_validator("angle")
    @classmethod
    def validate_angle(cls, val: str | None) -> str | None:
        if val is not None and val not in standards.angles.all:
            raise ValueError(
                f"Ракурс должен быть один из {', '.join(standards.angles.all)}"
            )
        return val


class StandardMutationResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    angle: str | None
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
