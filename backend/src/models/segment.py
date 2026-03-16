from uuid import UUID, uuid4

from database import Base
from sqlalchemy import JSON, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Segment(Base):
    __tablename__ = "segments"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE")
    )
    label: Mapped[str] = mapped_column(String(255))
    mask_path: Mapped[str | None] = mapped_column(String(500), default=None)
    points: Mapped[list] = mapped_column(JSON, default=list)
    confidence_threshold: Mapped[float] = mapped_column(default=0.7)
    is_critical: Mapped[bool] = mapped_column(default=True)

    standard: Mapped["Standard"] = relationship(back_populates="segments")
