from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

import sqlalchemy
from database import Base
from sqlalchemy import ForeignKey, Index, String, func, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

Angle = Literal["front", "top", "left", "right", "back"]


class Standard(Base):
    __tablename__ = "standards"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    group_id: Mapped[UUID] = mapped_column(
        ForeignKey("groups.id", ondelete="CASCADE"), index=True
    )
    name: Mapped[str] = mapped_column(String(255))
    angle: Mapped[Angle | None] = mapped_column(
        sqlalchemy.Enum("front", "top", "left", "right", "back", name="angle_enum"),
        default=None,
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    group: Mapped["Group"] = relationship(back_populates="standards")
    images: Mapped[list["StandardImage"]] = relationship(
        back_populates="standard", cascade="all, delete-orphan"
    )
    segments: Mapped[list["Segment"]] = relationship(
        back_populates="standard", cascade="all, delete-orphan"
    )
    segment_groups: Mapped[list["SegmentGroup"]] = relationship(
        back_populates="standard", cascade="all, delete-orphan"
    )
    inspections: Mapped[list["InspectionResult"]] = relationship(
        back_populates="standard"
    )

    @property
    def image_count(self) -> int:
        return len(self.images)

    @property
    def annotated_count(self) -> int:
        return sum(1 for image in self.images if len(image.annotations) > 0)

    @property
    def reference_path(self) -> str | None:
        ref = next((img for img in self.images if img.is_reference), None)
        return ref.image_path if ref else None


class StandardImage(Base):
    __tablename__ = "standard_images"
    __table_args__ = (
        Index(
            "uq_standard_reference",
            "standard_id",
            unique=True,
            postgresql_where=text("is_reference = true"),
        ),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE"), index=True
    )
    image_path: Mapped[str] = mapped_column(String(500))
    is_reference: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    standard: Mapped["Standard"] = relationship(back_populates="images")
    annotations: Mapped[list["SegmentAnnotation"]] = relationship(
        back_populates="image", cascade="all, delete-orphan"
    )

    @property
    def annotation_count(self) -> int:
        return len(self.annotations)
