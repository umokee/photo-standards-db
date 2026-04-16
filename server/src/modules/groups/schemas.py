from datetime import datetime
from typing import Annotated, Self
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


class GroupStatsResponse(BaseModel):
    standards_count: int = 0
    images_count: int = 0
    annotated_count: int = 0
    polygons_count: int = 0
    segment_groups_count: int = 0
    segments_count: int = 0
    models_count: int = 0


class GroupStandardResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    name: str
    angle: str | None
    is_active: bool
    created_at: datetime
    reference_path: str | None = None
    images_count: int = 0
    annotated_images_count: int = 0


class GroupActiveModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID
    architecture: str
    version: int
    epochs: int | None
    imgsz: int
    batch_size: int | None
    num_classes: int | None
    metrics: dict | None
    class_names: list[str] | None = None
    is_active: bool
    trained_at: datetime | None
    created_at: datetime


class GroupListItemResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    created_at: datetime
    stats: GroupStatsResponse


class GroupDetailResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None
    created_at: datetime
    stats: GroupStatsResponse
    standards: list[GroupStandardResponse] = Field(default_factory=list)
    active_model: GroupActiveModelResponse | None = None


class GroupMutationResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    name: str
    description: str | None = None
    created_at: datetime


class GroupCreate(BaseModel):
    name: Name
    description: str | None = None


class GroupUpdate(BaseModel):
    name: Name | None = None
    description: str | None = None

    @model_validator(mode="after")
    def validate_not_empty(self) -> Self:
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self
