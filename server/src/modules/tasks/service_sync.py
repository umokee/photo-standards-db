from __future__ import annotations

from datetime import datetime
from uuid import UUID

from sqlalchemy.orm import Session

from .models import Task

TERMINAL_TASK_STATUSES = ("succeeded", "failed", "cancelled")


def get_task_sync(db: Session, task_id: UUID) -> Task | None:
    return db.get(Task, task_id)


def set_task_state_sync(
    db: Session,
    task: Task,
    *,
    status: str | None = None,
    stage: str | None = None,
    message: str | None = None,
    error: str | None = None,
    result: dict | None = None,
) -> None:
    if status is not None:
        task.status = status
    if stage is not None:
        task.stage = stage
    if message is not None:
        task.message = message
    if error is not None:
        task.error = error[:2000]
    if result is not None:
        task.result = result

    now = datetime.now()
    if task.status == "running" and task.started_at is None:
        task.started_at = now
    if task.status in TERMINAL_TASK_STATUSES and task.finished_at is None:
        task.finished_at = now
    if task.status == "cancelled" and task.cancelled_at is None:
        task.cancelled_at = now

    db.commit()


def set_task_progress_sync(
    db: Session,
    task: Task,
    *,
    current: int,
    total: int,
    stage: str,
    message: str | None = None,
) -> None:
    task.progress_current = current
    task.progress_total = total
    task.progress_percent = round(current / total * 100) if total else None
    task.stage = stage
    if message is not None:
        task.message = message
    db.commit()


def is_task_cancelled_sync(db: Session, task: Task) -> bool:
    db.refresh(task)
    return task.status == "cancelled"
