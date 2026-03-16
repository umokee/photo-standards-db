from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints

ModelType = Literal["???", "???", "???"]
Status = Literal["training_started", "completed", "failed"]
Name = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=255),
]


class MlModelCreate(BaseModel):
    name: Name
    model_type: ModelType = "???"
    weights_path: str
    version: int = Field(..., ge=1)
    metrics: dict | None = None
    is_active: bool = False


class MlModelTrainRequest(BaseModel):
    epochs: int = Field(50, ge=1, le=500)
    model_type: ModelType = "???"


class MlModelTrainResponse(BaseModel):
    model_id: UUID
    version: int
    status: Status


class MlModelShortResponse(BaseModel):
    id: UUID
    name: str
    model_type: str
    version: int
    metrics: dict | None
    is_active: bool
    trained_at: datetime | None

    model_config = ConfigDict(from_attributes=True)


class MlModelResponse(BaseModel):
    id: UUID
    group_id: UUID
    name: str
    model_type: str
    weights_path: str
    version: int
    metrics: dict | None
    is_active: bool
    trained_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
