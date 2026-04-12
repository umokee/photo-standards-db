from datetime import datetime
from uuid import UUID

from _shared.constants import training
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


class MlModelTrainRequest(BaseModel):
    group_id: UUID
    train_ratio: int = Field(
        training.train_ratio.default,
        ge=training.train_ratio.min,
        le=training.train_ratio.max,
    )
    val_ratio: int = Field(
        training.val_ratio.default,
        ge=training.val_ratio.min,
        le=training.val_ratio.max,
    )
    architecture: str = training.architecture.default
    epochs: int = Field(
        training.epochs.default,
        ge=training.epochs.min,
        le=training.epochs.max,
    )
    imgsz: int = training.image_size.default
    batch_size: int = Field(
        training.batch_size.default,
        ge=training.batch_size.min,
        le=training.batch_size.max,
    )

    @field_validator("architecture")
    @classmethod
    def validate_architecture(cls, val: str) -> str:
        if val not in training.architecture.all:
            raise ValueError(f"Архитектура: {', '.join(training.architecture.all)}")
        return val

    @field_validator("imgsz")
    @classmethod
    def validate_imgsz(cls, val: int) -> int:
        if val not in training.image_size.all:
            raise ValueError(f"Размер: {', '.join(map(str, training.image_size.all))}")
        return val

    @model_validator(mode="after")
    def validate_ratio_sum(self) -> "MlModelTrainRequest":
        safe = min(training.split.ratio_sum_max, 100)
        if self.train_ratio + self.val_ratio > safe:
            raise ValueError(f"Cумма train и val не может превышать {safe}%")
        return self


class MlModelResponse(BaseModel):
    id: UUID
    group_id: UUID
    version: int
    group_name: str | None = None
    weights_path: str
    architecture: str
    epochs: int | None
    imgsz: int
    batch_size: int | None
    num_classes: int | None
    metrics: dict | None
    class_names: list[str] | None = None
    train_ratio: int | None = None
    val_ratio: int | None = None
    test_ratio: int | None = None
    total_images: int | None = None
    train_count: int | None = None
    val_count: int | None = None
    test_count: int | None = None
    training_status: str | None = None
    training_progress: int | None = None
    training_stage: str | None = None
    training_error: str | None = None
    training_started_at: datetime | None = None
    training_finished_at: datetime | None = None
    is_active: bool
    trained_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
