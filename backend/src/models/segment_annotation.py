from uuid import UUID, uuid4

from database import Base
from sqlalchemy import JSON, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship


class SegmentAnnotation(Base):
    __tablename__ = "segment_annotations"
    __table_args__ = (
        UniqueConstraint("segment_id", "image_id", name="uq_segment_image"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    segment_id: Mapped[UUID] = mapped_column(
        ForeignKey("segments.id", ondelete="CASCADE")
    )
    image_id: Mapped[UUID] = mapped_column(
        ForeignKey("standard_images.id", ondelete="CASCADE")
    )
    points: Mapped[list] = mapped_column(JSON, default=list)

    segment: Mapped["Segment"] = relationship(back_populates="annotations")
    image: Mapped["StandardImage"] = relationship(back_populates="annotations")
