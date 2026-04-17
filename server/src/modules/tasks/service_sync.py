from __future__ import annotations

import json
from datetime import datetime
from uuid import UUID

from sqlalchemy import func, select, text
from sqlalchemy.orm import Session

from .models import Task

ACTIVE_TASK_STATUSES = ("pending", "queued", "running", "pausing", "resuming")
TERMINAL_TASK_STATUSES = ("succeeded", "failed", "cancelled")


def _enqueue_training_job_raw(
    db: Session,
    *,
    task_id: str,
    queueing_lock: str,
    queue: str = "gpu",
    priority: int = 60,
) -> int | None:
    """
    Прямая вставка в procrastinate_jobs через текущую sync-сессию.
    Используется из синхронного worker-контекста, где async defer недоступен.
    ON CONFLICT DO NOTHING — queueing_lock гарантирует идемпотентность.
    """
    row = db.execute(
        text("""
            INSERT INTO procrastinate_jobs
                (queue_name, task_name, priority, args, queueing_lock)
            VALUES
                (:queue, :task_name, :priority, :args::jsonb, :lock)
            ON CONFLICT DO NOTHING
            RETURNING id
        """),
        {
            "queue": queue,
            "task_name": "modules.training.jobs.execute_training",
            "priority": priority,
            "args": json.dumps({"task_id": task_id}),
            "lock": queueing_lock,
        },
    ).fetchone()
    return int(row[0]) if row else None


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
    if task.status in {"running", "resuming"} and task.started_at is None:
        task.started_at = now
    if task.status in TERMINAL_TASK_STATUSES and task.finished_at is None:
        task.finished_at = now
    if task.status == "cancelled" and task.cancelled_at is None:
        task.cancelled_at = now
    if task.status in {"running", "resuming", "pausing"}:
        task.heartbeat_at = now

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
    task.heartbeat_at = datetime.now()
    db.commit()


def is_task_cancelled_sync(db: Session, task: Task) -> bool:
    db.refresh(task)
    return task.status == "cancelled"


def count_active_inspections_sync(
    db: Session,
    *,
    exclude_task_id: UUID | None = None,
) -> int:
    stmt = select(func.count(Task.id)).where(
        Task.type == "inspection_run",
        Task.queue == "gpu",
        Task.status.in_(ACTIVE_TASK_STATUSES),
    )
    if exclude_task_id is not None:
        stmt = stmt.where(Task.id != exclude_task_id)
    return int(db.execute(stmt).scalar_one() or 0)


def maybe_resume_paused_training_sync(
    db: Session,
    *,
    exclude_inspection_task_id: UUID | None = None,
) -> Task | None:
    if (
        count_active_inspections_sync(db, exclude_task_id=exclude_inspection_task_id)
        > 0
    ):
        return None

    task = db.execute(
        select(Task)
        .where(
            Task.type == "model_training",
            Task.queue == "gpu",
            Task.status == "paused",
            Task.auto_resume.is_(True),
        )
        .order_by(Task.created_at.asc())
        .limit(1)
    ).scalar_one_or_none()

    if task is None:
        return None

    job_id = _enqueue_training_job_raw(
        db,
        task_id=str(task.id),
        queueing_lock=f"resume:{task.id}",
        priority=60,
    )
    task.external_job_id = str(job_id) if job_id else None

    task.external_job_id = str(job.id)
    task.status = "queued"
    task.stage = "В очереди"
    task.message = "Возобновление после проверки"
    task.abort_requested = False
    db.commit()
    return task
