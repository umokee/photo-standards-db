from __future__ import annotations

from datetime import datetime
from typing import TYPE_CHECKING
from uuid import UUID, uuid4

import sqlalchemy
from app.db import Base
from constants import inspections
from sqlalchemy import ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

if TYPE_CHECKING:
    from modules.cameras.models import Camera
    from modules.ml_models.models import MlModel
    from modules.segments.models import Segment, SegmentGroup
    from modules.standards.models import Standard
    from modules.users.models import User


class InspectionResult(Base):
    __tablename__ = "inspection_results"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("standards.id", ondelete="SET NULL"), default=None, index=True
    )
    model_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("ml_models.id", ondelete="SET NULL"), default=None, index=True
    )
    camera_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("cameras.id", ondelete="SET NULL"), default=None, index=True
    )
    user_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), default=None, index=True
    )
    image_path: Mapped[str] = mapped_column(String(500))
    result_image_path: Mapped[str | None] = mapped_column(String(500), default=None)
    status: Mapped[str] = mapped_column(
        sqlalchemy.Enum(*inspections.statuses, name="inspection_status_enum"),
        default=inspections.statuses.default,
    )
    mode: Mapped[str] = mapped_column(
        sqlalchemy.Enum(*inspections.modes, name="inspection_mode_enum"),
        default=inspections.modes.default,
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

    standard: Mapped[Standard | None] = relationship(back_populates="inspections")
    ml_model: Mapped[MlModel | None] = relationship(back_populates="inspections")
    camera: Mapped[Camera | None] = relationship()
    user: Mapped[User | None] = relationship()
    segment_results: Mapped[list[InspectionSegmentResult]] = relationship(
        back_populates="inspection", cascade="all, delete-orphan"
    )


class InspectionSegmentResult(Base):
    __tablename__ = "inspection_segment_results"
    __table_args__ = (
        UniqueConstraint("inspection_id", "segment_id", name="uq_inspection_segment"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    inspection_id: Mapped[UUID] = mapped_column(
        ForeignKey("inspection_results.id", ondelete="CASCADE"),
        index=True,
    )
    segment_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("segments.id", ondelete="SET NULL"),
        default=None,
        index=True,
    )
    segment_group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("segment_groups.id", ondelete="SET NULL"),
        default=None,
        index=True,
    )
    name: Mapped[str] = mapped_column(String(255))
    is_found: Mapped[bool] = mapped_column()
    confidence: Mapped[float | None] = mapped_column(default=None)
    expected_count: Mapped[int | None] = mapped_column(default=None)
    detected_count: Mapped[int | None] = mapped_column(default=None)
    delta: Mapped[int | None] = mapped_column(default=None)
    status: Mapped[str | None] = mapped_column(String(20), default=None)

    inspection: Mapped[InspectionResult] = relationship(back_populates="segment_results")
    segment: Mapped[Segment | None] = relationship()
    segment_group: Mapped[SegmentGroup | None] = relationship()
