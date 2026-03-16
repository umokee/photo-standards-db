from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

import sqlalchemy
from database import Base
from sqlalchemy import ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

Status = Literal["passed", "failed"]
Mode = Literal["photo", "snapshot", "realtime"]


class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("standards.id", ondelete="SET NULL"), default=None
    )
    model_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("ml_models.id", ondelete="SET NULL"), default=None
    )
    image_path: Mapped[str] = mapped_column(String(500))
    result_image_path: Mapped[str | None] = mapped_column(String(500), default=None)
    status: Mapped[Status] = mapped_column(
        sqlalchemy.Enum("passed", "failed", name="status_enum"), default="passed"
    )
    mode: Mapped[Mode] = mapped_column(
        sqlalchemy.Enum("photo", "snapshot", "realtime", name="mode_enum"),
        default="photo",
    )
    total_segments: Mapped[int] = mapped_column()
    matched_segments: Mapped[int] = mapped_column()
    serial_number: Mapped[str | None] = mapped_column(
        String(100), default=None, index=True
    )
    notes: Mapped[str | None] = mapped_column(Text, default=None)
    inspected_at: Mapped[datetime] = mapped_column(
        server_default=func.now(), index=True
    )

    standard: Mapped["Standard | None"] = relationship(back_populates="inspections")
    ml_model: Mapped["MlModel | None"] = relationship(back_populates="inspections")
    segment_results: Mapped[list["InspectionSegmentResult"]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )


class InspectionSegmentResult(Base):
    __tablename__ = "inspection_segment_results"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    inspection_id: Mapped[UUID] = mapped_column(
        ForeignKey("inspection_results.id", ondelete="CASCADE")
    )
    segment_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("segments.id", ondelete="SET NULL")
    )
    is_found: Mapped[bool] = mapped_column()
    confidence: Mapped[float | None] = mapped_column(default=None)

    inspection: Mapped["InspectionResult"] = relationship(
        back_populates="segment_results"
    )
    segment: Mapped["Segment"] = relationship()
