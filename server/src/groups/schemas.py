from datetime import datetime
from uuid import UUID

from _shared.schemas import Name, OptionalName, UpdateNotEmpty
from pydantic import (
    BaseModel,
    ConfigDict,
)


class GroupStatsResponse(BaseModel):
    standards_count: int = 0
    images_count: int = 0
    annotated_count: int = 0
    polygons_count: int = 0
    segment_groups_count: int = 0
    segments_count: int = 0
    models_count: int = 0


class GroupStandardShortResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    angle: str | None
    is_active: bool
    created_at: datetime
    reference_path: str | None = None
    image_count: int = 0
    annotated_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class GroupActiveModelResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
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

    model_config = ConfigDict(from_attributes=True)


class GroupListItemResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    stats: GroupStatsResponse

    model_config = ConfigDict(from_attributes=True)


class GroupDetailResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    stats: GroupStatsResponse
    standards: list[GroupStandardShortResponse] = []
    active_model: GroupActiveModelResponse | None = None


class GroupCreate(BaseModel):
    name: Name
    description: str | None = None


class GroupUpdate(UpdateNotEmpty):
    name: OptionalName
    description: str | None = None


class GroupMutationResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
