from datetime import datetime
from uuid import UUID, uuid4

import sqlalchemy
from _shared.constants import training
from database import Base
from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Index,
    Integer,
    String,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

_ACTIVE_TRAINING_SQL = ", ".join(f"'{status}'" for status in training.statuses.active)


class MlModel(Base):
    __tablename__ = "ml_models"
    __table_args__ = (
        Index(
            "uq_group_active_model",
            "group_id",
            unique=True,
            postgresql_where=text("is_active = true"),
        ),
        Index(
            "uq_group_model_version",
            "group_id",
            "version",
            unique=True,
        ),
        Index(
            "uq_group_active_training",
            "group_id",
            unique=True,
            postgresql_where=text(f"training_status IN ({_ACTIVE_TRAINING_SQL})"),
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    group_id: Mapped[UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), index=True
    )
    version: Mapped[int] = mapped_column(Integer, CheckConstraint("version > 0"))
    architecture: Mapped[str] = mapped_column(
        sqlalchemy.Enum(*training.architecture.all, name="architecture_enum"),
        default=training.architecture.default,
    )
    weights_path: Mapped[str] = mapped_column(String(500))
    epochs: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("epochs > 0"), default=None
    )
    imgsz: Mapped[int] = mapped_column(
        Integer,
        CheckConstraint(f"imgsz IN ({', '.join(map(str, training.image_size.all))})"),
        default=training.image_size.default,
    )
    batch_size: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("batch_size > 0"), default=None
    )
    num_classes: Mapped[int | None] = mapped_column(
        Integer, CheckConstraint("num_classes > 0"), default=None
    )
    metrics: Mapped[dict | None] = mapped_column(JSONB, default=None)
    class_names: Mapped[list | None] = mapped_column(JSONB, default=None)
    train_ratio: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("train_ratio BETWEEN 0 AND 100"), default=None
    )
    val_ratio: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("val_ratio BETWEEN 0 AND 100"), default=None
    )
    test_ratio: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("test_ratio BETWEEN 0 AND 100"), default=None
    )
    total_images: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("total_images >= 0"), default=None
    )
    train_count: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("train_count >= 0"), default=None
    )
    val_count: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("val_count >= 0"), default=None
    )
    test_count: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("test_count >= 0"), default=None
    )
    training_job_id: Mapped[int | None] = mapped_column(
        BigInteger, default=None, index=True
    )
    training_status: Mapped[str | None] = mapped_column(String(50), default=None)
    training_progress: Mapped[int | None] = mapped_column(
        Integer(), CheckConstraint("training_progress >= 0"), default=None
    )
    training_stage: Mapped[str | None] = mapped_column(String(255), default=None)
    training_error: Mapped[str | None] = mapped_column(String(500), default=None)
    training_started_at: Mapped[datetime | None] = mapped_column(default=None)
    training_finished_at: Mapped[datetime | None] = mapped_column(default=None)
    is_active: Mapped[bool] = mapped_column(default=False)
    trained_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="ml_models")
    inspections: Mapped[list["InspectionResult"]] = relationship(
        back_populates="ml_model"
    )
