from typing import Self
from uuid import UUID

from constants import training
from pydantic import BaseModel, Field, field_validator, model_validator


class TrainRequest(BaseModel):
    group_id: UUID

    architecture: str = training.architectures.default
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

    @field_validator("architecture")
    @classmethod
    def validate_architecture(cls, val: str) -> str:
        if val not in training.architectures:
            raise ValueError(f"Неизвестная архитектура: {val}")
        return val

    @field_validator("imgsz")
    @classmethod
    def validate_imgsz(cls, val: int) -> int:
        if val not in training.image_size:
            raise ValueError(f"Некорректный размер изображения: {val}")
        return val

    @model_validator(mode="after")
    def validate_ratio_sum(self) -> Self:
        safe = min(training.ratio_sum_max, 100)
        if self.train_ratio + self.val_ratio > safe:
            raise ValueError(f"Сумма train и val должна быть меньше {safe}%")
        return self


class TrainingStartResponse(BaseModel):
    task_id: UUID
    model_id: UUID
