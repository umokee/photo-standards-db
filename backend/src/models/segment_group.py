from uuid import UUID, uuid4

from database import Base
from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class SegmentGroup(Base):
    __tablename__ = "segment_groups"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(255))
    hue: Mapped[int] = mapped_column(Integer, default=210)
    order_index: Mapped[int] = mapped_column(Integer, default=0)

    standard: Mapped["Standard"] = relationship(back_populates="segment_groups")
    segments: Mapped[list["Segment"]] = relationship(back_populates="segment_group")

    @property
    def segment_count(self) -> int:
        return len(self.segments)
