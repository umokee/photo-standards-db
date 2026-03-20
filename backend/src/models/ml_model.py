from datetime import datetime
from uuid import UUID, uuid4

from database import Base
from sqlalchemy import ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship


class MlModel(Base):
    __tablename__ = "ml_models"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    group_id: Mapped[UUID] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))
    name: Mapped[str] = mapped_column(String(255))
    architecture: Mapped[str] = mapped_column(String(50), default="yolov8n-seg")
    weights_path: Mapped[str] = mapped_column(String(500))
    version: Mapped[int] = mapped_column(Integer)
    epochs: Mapped[int | None] = mapped_column(Integer, default=None)
    imgsz: Mapped[int] = mapped_column(Integer, default=640)
    batch_size: Mapped[int | None] = mapped_column(Integer, default=None)
    num_classes: Mapped[int | None] = mapped_column(Integer, default=None)
    metrics: Mapped[dict | None] = mapped_column(JSONB, default=None)
    is_active: Mapped[bool] = mapped_column(default=False)
    trained_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="ml_models")
    inspections: Mapped[list["InspectionResult"]] = relationship(
        back_populates="ml_model"
    )
