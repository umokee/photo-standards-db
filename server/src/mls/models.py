from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

import sqlalchemy
from database import Base
from sqlalchemy import CheckConstraint, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

Architecture = Literal[
    "yolov26n-seg", "yolov26s-seg", "yolov26m-seg", "yolov26l-seg", "yolov26x-seg"
]
Status = Literal["pending", "preparing", "training", "saving", "done", "failed"]
Imgsz = Literal[320, 416, 512, 640, 768, 1024, 1280]


class MlModel(Base):
    __tablename__ = "ml_models"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    group_id: Mapped[UUID] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    architecture: Mapped[Architecture] = mapped_column(
        sqlalchemy.Enum(
            "yolov26n-seg",
            "yolov26s-seg",
            "yolov26m-seg",
            "yolov26l-seg",
            "yolov26x-seg",
            name="architecture_enum",
        ),
        default="yolov26n-seg",
    )
    weights_path: Mapped[str] = mapped_column(String(500))
    version: Mapped[int] = mapped_column(Integer, CheckConstraint("version > 0"))
    epochs: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("epochs > 0"), default=None
    )
    imgsz: Mapped[Imgsz] = mapped_column(
        sqlalchemy.Enum(
            "320", "416", "512", "640", "768", "1024", "1280", name="imgsz_enum"
        ),
        default="640",
    )
    batch_size: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("batch_size > 0"), default=None
    )
    num_classes: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("num_classes > 0"), default=None
    )
    metrics: Mapped[dict | None] = mapped_column(JSONB, default=None)
    class_names: Mapped[list | None] = mapped_column(JSONB, default=None)
    is_active: Mapped[bool] = mapped_column(default=False)
    trained_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="ml_models")
    inspections: Mapped[list["InspectionResult"]] = relationship(
        back_populates="ml_model"
    )
    training_tasks: Mapped[list["TrainingTask"]] = relationship(
        back_populates="ml_model"
    )


class TrainingTask(Base):
    __tablename__ = "training_tasks"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    group_id: Mapped[UUID] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))
    model_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("ml_models.id", ondelete="CASCADE"), default=None
    )
    status: Mapped[Status] = mapped_column(
        sqlalchemy.Enum(
            "pending",
            "preparing",
            "training",
            "saving",
            "done",
            "failed",
            name="status_enum",
        ),
        default="pending",
    )
    train_ratio: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("train_ratio BETWEEN 0 AND 100"), default=None
    )
    val_ratio: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("val_ratio BETWEEN 0 AND 100"), default=None
    )
    progress: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("progress > 0"), default=None
    )
    stage: Mapped[str | None] = mapped_column(String(255), default=None)
    error: Mapped[str | None] = mapped_column(String(500), default=None)
    started_at: Mapped[datetime | None] = mapped_column(default=None)
    finished_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="training_tasks")
    ml_model: Mapped["MlModel | None"] = relationship(back_populates="training_tasks")
