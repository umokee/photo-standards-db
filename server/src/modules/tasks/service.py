from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.exception import NotFoundError
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from .constants import (
    STATUS_CANCELLED,
    STATUS_FAILED,
    STATUS_PAUSING,
    STATUS_RESUMING,
    STATUS_RUNNING,
    STATUS_SUCCEEDED,
    TERMINAL_STATUSES,
)
from .models import Task


async def get_task(db: AsyncSession, task_id: UUID) -> Task:
    task = await db.get(Task, task_id)
    if task is None:
        raise NotFoundError("Задача", task_id)
    return task


async def find_task(db: AsyncSession, task_id: UUID) -> Task | None:
    return await db.get(Task, task_id)


async def list_tasks(
    db: AsyncSession,
    *,
    group_id: UUID | None = None,
    type: str | None = None,
    status: str | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
) -> list[Task]:
    stmt = select(Task).order_by(desc(Task.created_at))
    if group_id is not None:
        stmt = stmt.where(Task.group_id == group_id)
    if type is not None:
        stmt = stmt.where(Task.type == type)
    if status is not None:
        stmt = stmt.where(Task.status == status)
    if entity_type is not None:
        stmt = stmt.where(Task.entity_type == entity_type)
    if entity_id is not None:
        stmt = stmt.where(Task.entity_id == entity_id)
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def create_task(
    db: AsyncSession,
    *,
    type: str,
    status: str,
    queue: str | None,
    priority: int,
    payload: dict | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    group_id: UUID | None = None,
    auto_resume: bool = False,
    checkpoint_path: str | None = None,
    run_dir: str | None = None,
) -> Task:
    task = Task(
        type=type,
        status=status,
        queue=queue,
        priority=priority,
        payload=payload,
        entity_type=entity_type,
        entity_id=entity_id,
        group_id=group_id,
        auto_resume=auto_resume,
        checkpoint_path=checkpoint_path,
        run_dir=run_dir,
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_task_status(
    db: AsyncSession,
    *,
    task_id: UUID,
    status: str,
    stage: str | None = None,
    message: str | None = None,
    error: str | None = None,
    result: dict | None = None,
    external_job_id: str | None = None,
) -> Task:
    task = await get_task(db, task_id)
    _apply_state(
        task,
        status=status,
        stage=stage,
        message=message,
        error=error,
        result=result,
        external_job_id=external_job_id,
    )
    await db.commit()
    await db.refresh(task)
    return task


async def update_task_progress(
    db: AsyncSession,
    *,
    task_id: UUID,
    current: int,
    total: int,
    stage: str,
    message: str | None = None,
) -> Task:
    task = await get_task(db, task_id)
    task.progress_current = current
    task.progress_total = total
    task.progress_percent = round(current / total * 100) if total else None
    task.stage = stage
    if message is not None:
        task.message = message
    task.heartbeat_at = _now()
    await db.commit()
    await db.refresh(task)
    return task


async def heartbeat_task(db: AsyncSession, task_id: UUID) -> None:
    task = await get_task(db, task_id)
    task.heartbeat_at = _now()
    await db.commit()


async def cancel_task(db: AsyncSession, *, task_id: UUID) -> Task:
    task = await get_task(db, task_id)
    if task.status in TERMINAL_STATUSES:
        return task

    task.abort_requested = True
    _apply_state(
        task,
        status=STATUS_CANCELLED,
        stage="Отменено",
        message="Задача отменена пользователем",
    )

    if task.external_job_id and task.external_job_id.isdigit():
        from infra.queue.scheduler import cancel_procrastinate_job

        await cancel_procrastinate_job(int(task.external_job_id))

    await db.commit()
    await db.refresh(task)
    return task


async def cleanup_old_terminal_tasks(db: AsyncSession, *, keep_days: int = 30) -> int:
    threshold = _now() - timedelta(days=keep_days)
    result = await db.execute(
        select(Task).where(
            Task.status.in_({STATUS_SUCCEEDED, STATUS_FAILED, STATUS_CANCELLED}),
            Task.finished_at.is_not(None),
            Task.finished_at < threshold,
        )
    )
    items = list(result.scalars().all())
    for item in items:
        await db.delete(item)
    if items:
        await db.commit()
    return len(items)


def _apply_state(
    task: Task,
    *,
    status: str | None = None,
    stage: str | None = None,
    message: str | None = None,
    error: str | None = None,
    result: dict | None = None,
    external_job_id: str | None = None,
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
    if external_job_id is not None:
        task.external_job_id = external_job_id

    if task.status in {STATUS_RUNNING, STATUS_RESUMING} and task.started_at is None:
        task.started_at = _now()

    if task.status in TERMINAL_STATUSES and task.finished_at is None:
        task.finished_at = _now()

    if task.status == STATUS_CANCELLED and task.cancelled_at is None:
        task.cancelled_at = _now()

    if task.status in {STATUS_RUNNING, STATUS_RESUMING, STATUS_PAUSING}:
        task.heartbeat_at = _now()


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)
