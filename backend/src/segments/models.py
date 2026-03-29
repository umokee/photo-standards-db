from uuid import UUID, uuid4

from database import Base
from sqlalchemy import JSON, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship


class SegmentGroup(Base):
    __tablename__ = "segment_groups"
    __table_args__ = (UniqueConstraint("standard_id", "name"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE")
    )
    name: Mapped[str] = mapped_column(String(255))
    hue: Mapped[int] = mapped_column(Integer, default=210)

    standard: Mapped["Standard"] = relationship(back_populates="segment_groups")
    segments: Mapped[list["Segment"]] = relationship(back_populates="segment_group")

    @property
    def segment_count(self) -> int:
        return len(self.segments)


class Segment(Base):
    __tablename__ = "segments"
    __table_args__ = (UniqueConstraint("standard_id", "segment_group_id", "name"),)

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE")
    )
    segment_group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("segment_groups.id", ondelete="SET NULL"), default=None
    )
    name: Mapped[str] = mapped_column(String(255))

    standard: Mapped["Standard"] = relationship(back_populates="segments")
    segment_group: Mapped["SegmentGroup | None"] = relationship(
        back_populates="segments"
    )
    annotations: Mapped[list["SegmentAnnotation"]] = relationship(
        back_populates="segment", cascade="all, delete-orphan"
    )


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
