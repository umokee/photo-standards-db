from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field

Architecture = Literal[
    "yolov26n-seg",
    "yolov26s-seg",
    "yolov26m-seg",
    "yolov26l-seg",
    "yolov26x-seg",
]


class MlModelTrainRequest(BaseModel):
    group_id: UUID
    train_ratio: int = Field(80, ge=50, le=80)
    val_ratio: int = Field(10, ge=0, le=45)
    architecture: Architecture = "yolov26n-seg"
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
    class_names: list[str] | None = None
    is_active: bool
    trained_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MlModelDetailResponse(MlModelResponse):
    group_name: str | None = None
    weights_path: str


class TrainingTaskResponse(BaseModel):
    id: UUID
    group_id: UUID
    model_id: UUID | None
    status: str
    progress: int | None
    stage: str | None
    error: str | None
    train_ratio: int | None
    val_ratio: int | None
    started_at: datetime | None
    finished_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
