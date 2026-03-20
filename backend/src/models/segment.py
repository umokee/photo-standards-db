from uuid import UUID, uuid4

from database import Base
from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    image_id: Mapped[UUID] = mapped_column(
        ForeignKey("standard_images.id", ondelete="CASCADE")
    )
    segment_group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("segment_groups.id", ondelete="SET NULL"), default=None
    )
    label: Mapped[str] = mapped_column(String(255))
    points: Mapped[list] = mapped_column(JSON, default=list)
    mask_path: Mapped[str | None] = mapped_column(String(500), default=None)

    image: Mapped["StandardImage"] = relationship(back_populates="segments")
    segment_group: Mapped["SegmentGroup | None"] = relationship(
        back_populates="segments"
    )
