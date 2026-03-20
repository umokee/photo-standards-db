from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Architecture = Literal[
    "yolov8n-seg", "yolov8s-seg", "yolov8m-seg", "yolov8l-seg", "yolov8x-seg"
]


class MlModelTrainRequest(BaseModel):
    group_id: UUID
    architecture: Architecture = "yolov8n-seg"
    epochs: int = Field(100, ge=1, le=1000)
    imgsz: int = Field(640, ge=32)
    batch_size: int = Field(16, ge=1, le=256)


class MlModelResponse(BaseModel):
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
    is_active: bool
    trained_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MlModelDetailResponse(MlModelResponse):
    group_name: str | None = None
    weights_path: str
