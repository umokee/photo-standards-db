from datetime import datetime
from uuid import UUID, uuid4

from database import Base
from sqlalchemy import String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship


class Group(Base):
    __tablename__ = "groups"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255), unique=True)
    description: Mapped[str | None] = mapped_column(Text, default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    standards: Mapped[list["Standard"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )
    ml_models: Mapped[list["MlModel"]] = relationship(
        back_populates="group", cascade="all, delete-orphan"
    )

    @property
    def standards_count(self) -> int:
        return len(self.standards)

    @property
    def images_count(self) -> int:
        return sum(s.image_count for s in self.standards)
