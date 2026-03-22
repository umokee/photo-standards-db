from datetime import datetime
from uuid import UUID, uuid4

from database import Base
from sqlalchemy import ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class StandardImage(Base):
    __tablename__ = "standard_images"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    standard_id: Mapped[UUID] = mapped_column(
        ForeignKey("standards.id", ondelete="CASCADE")
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
