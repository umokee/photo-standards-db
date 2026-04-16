from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class MlModelResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    group_id: UUID

    architecture: str
    weights_path: str | None = None
    version: int

    epochs: int | None = None
    imgsz: int
    batch_size: int | None = None

    num_classes: int | None = None
    class_names: list[str] | None = None
    metrics: dict | None = None

    train_ratio: int | None = None
    val_ratio: int | None = None
    test_ratio: int | None = None

    total_images: int | None = None
    train_count: int | None = None
    val_count: int | None = None
    test_count: int | None = None

    is_active: bool
    trained_at: datetime | None = None
    created_at: datetime
