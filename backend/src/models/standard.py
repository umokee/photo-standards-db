from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

import sqlalchemy
from database import Base
from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

Angle = Literal["front", "top", "left", "right", "back"]


class Standard(Base):
    __tablename__ = "standards"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    group_id: Mapped[UUID] = mapped_column(ForeignKey("groups.id", ondelete="CASCADE"))
    name: Mapped[str | None] = mapped_column(String(255), default=None)
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
        return sum(1 for image in self.images if len(image.segments) > 0)
