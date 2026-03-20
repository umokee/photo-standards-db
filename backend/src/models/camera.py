from datetime import datetime
from uuid import UUID, uuid4

from database import Base
from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column


class Camera(Base):
    __tablename__ = "cameras"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(255))
    rtsp_url: Mapped[str] = mapped_column(String(500))
    resolution: Mapped[str | None] = mapped_column(String(20), default=None)
    location: Mapped[str | None] = mapped_column(String(255), default=None)
    is_active: Mapped[bool] = mapped_column(default=True)
    last_seen_at: Mapped[datetime | None] = mapped_column(default=None)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
