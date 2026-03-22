from uuid import UUID, uuid4

from database import Base
from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE")
    )
    segment_group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("segment_groups.id", ondelete="SET NULL"), default=None
    )
    label: Mapped[str] = mapped_column(String(255))

    standard: Mapped["Standard"] = relationship(back_populates="segments")
    segment_group: Mapped["SegmentGroup | None"] = relationship(
        back_populates="segments"
    )
    annotations: Mapped[list["SegmentAnnotation"]] = relationship(
        back_populates="segment", cascade="all, delete-orphan"
    )
