from datetime import datetime
from uuid import UUID, uuid4

from app.db import Base
from sqlalchemy import ForeignKey, Index, Integer, String, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column


class Task(Base):
    __tablename__ = "tasks"
    __table_args__ = (
        Index("ix_tasks_type_status", "type", "status"),
        Index("ix_tasks_entity", "entity_type", "entity_id"),
    )

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)

    type: Mapped[str] = mapped_column(String(50), index=True)
    status: Mapped[str] = mapped_column(String(30), index=True)

    queue: Mapped[str | None] = mapped_column(String(50), default=None, index=True)
    priority: Mapped[int] = mapped_column(Integer, default=100)

    progress_current: Mapped[int | None] = mapped_column(Integer, default=None)
    progress_total: Mapped[int | None] = mapped_column(Integer, default=None)
    progress_percent: Mapped[int | None] = mapped_column(Integer, default=None)

    stage: Mapped[str | None] = mapped_column(String(255), default=None)
    message: Mapped[str | None] = mapped_column(String(500), default=None)
    error: Mapped[str | None] = mapped_column(String(2000), default=None)

    payload: Mapped[dict | None] = mapped_column(JSONB, default=None)
    result: Mapped[dict | None] = mapped_column(JSONB, default=None)

    entity_type: Mapped[str | None] = mapped_column(
        String(50), default=None, index=True
    )
    entity_id: Mapped[UUID | None] = mapped_column(default=None, index=True)

    group_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("groups.id", ondelete="SET NULL"),
        default=None,
        index=True,
    )
    created_by_id: Mapped[UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        default=None,
        index=True,
    )

    external_job_id: Mapped[str | None] = mapped_column(
        String(100), default=None, index=True
    )
    idempotency_key: Mapped[str | None] = mapped_column(
        String(100), default=None, unique=True
    )

    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    started_at: Mapped[datetime | None] = mapped_column(default=None)
    finished_at: Mapped[datetime | None] = mapped_column(default=None)
    cancelled_at: Mapped[datetime | None] = mapped_column(default=None)
