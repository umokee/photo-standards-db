from __future__ import annotations

from datetime import datetime
from uuid import UUID

from app.exception import ConflictError, NotFoundError
from sqlalchemy import desc, select, text
from sqlalchemy.ext.asyncio import AsyncSession

from .models import Task

ACTIVE_TASK_STATUSES = ("pending", "queued", "running")
TERMINAL_TASK_STATUSES = ("succeeded", "failed", "cancelled")


async def get_task(db: AsyncSession, task_id: UUID) -> Task:
    task = await db.get(Task, task_id)
    if not task:
        raise NotFoundError("Задача", task_id)
    return task


async def list_tasks(
    db: AsyncSession,
    *,
    group_id: UUID | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    type: str | None = None,
    status: str | None = None,
) -> list[Task]:
    stmt = select(Task).order_by(desc(Task.created_at))

    if group_id is not None:
        stmt = stmt.where(Task.group_id == group_id)
    if entity_type is not None:
        stmt = stmt.where(Task.entity_type == entity_type)
    if entity_id is not None:
        stmt = stmt.where(Task.entity_id == entity_id)
    if type is not None:
        stmt = stmt.where(Task.type == type)
    if status is not None:
        stmt = stmt.where(Task.status == status)

    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_active_task_for_group(
    db: AsyncSession,
    *,
    group_id: UUID,
    type: str,
) -> Task | None:
    result = await db.execute(
        select(Task)
        .where(
            Task.group_id == group_id,
            Task.type == type,
            Task.status.in_(ACTIVE_TASK_STATUSES),
        )
        .order_by(desc(Task.created_at))
        .limit(1)
    )
    return result.scalar_one_or_none()


async def ensure_no_active_task_for_group(
    db: AsyncSession,
    *,
    group_id: UUID,
    type: str,
) -> None:
    task = await get_active_task_for_group(db, group_id=group_id, type=type)
    if task:
        raise ConflictError("Для этой группы уже выполняется задача")


async def create_task(
    db: AsyncSession,
    *,
    type: str,
    status: str = "pending",
    queue: str | None = None,
    payload: dict | None = None,
    entity_type: str | None = None,
    entity_id: UUID | None = None,
    group_id: UUID | None = None,
    external_job_id: str | None = None,
) -> Task:
    task = Task(
        type=type,
        status=status,
        queue=queue,
        payload=payload,
        entity_type=entity_type,
        entity_id=entity_id,
        group_id=group_id,
        external_job_id=external_job_id,
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

    now = datetime.now()
    if status == "running" and task.started_at is None:
        task.started_at = now
    if status in TERMINAL_TASK_STATUSES and task.finished_at is None:
        task.finished_at = now
    if status == "cancelled" and task.cancelled_at is None:
        task.cancelled_at = now

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

    await db.commit()
    await db.refresh(task)
    return task


async def cancel_task(
    db: AsyncSession,
    *,
    task_id: UUID,
) -> Task:
    """
    Best-effort отмена. Меняем статус локальной задачи, но сам Procrastinate-job
    продолжает крутиться до завершения. Когда job закончится, jobs.py увидит
    status == "cancelled" и просто выйдет, не перезаписывая состояние.
    Полная отмена через procrastinate_app.cancel_job_by_id — TODO v2.
    """
    task = await get_task(db, task_id)
    if task.status in TERMINAL_TASK_STATUSES:
        return task

    now = datetime.now()
    task.status = "cancelled"
    task.cancelled_at = now
    task.finished_at = task.finished_at or now

    await db.commit()
    await db.refresh(task)
    return task


async def fail_stale_running_tasks(
    db: AsyncSession,
    *,
    queue: str | None = None,
) -> int:
    """
    Синхронизация состояния задач после перезапуска backend'а.
    Проходит по всем активным задачам и сверяется с procrastinate_jobs,
    приводя локальное состояние к реальному.
    """
    stmt = select(Task).where(
        Task.status.in_(ACTIVE_TASK_STATUSES),
        Task.finished_at.is_(None),
    )
    if queue is not None:
        stmt = stmt.where(Task.queue == queue)

    result = await db.execute(stmt)
    tasks = list(result.scalars().all())
    if not tasks:
        return 0

    changed = 0
    now = datetime.now()

    for task in tasks:
        if not task.external_job_id or not task.external_job_id.isdigit():
            task.status = "failed"
            task.stage = "Потеряна в очереди"
            task.message = "Синхронизация после перезапуска"
            task.error = "Локальная задача не содержит корректный external_job_id"
            task.finished_at = now
            changed += 1
            continue

        job_status = (
            await db.execute(
                text("SELECT status::text FROM procrastinate_jobs WHERE id = :job_id"),
                {"job_id": int(task.external_job_id)},
            )
        ).scalar_one_or_none()

        if job_status is None:
            task.status = "failed"
            task.stage = "Потеряна в очереди"
            task.message = "Синхронизация после перезапуска"
            task.error = "Связанная job не найдена в procrastinate_jobs"
            task.finished_at = now
            changed += 1
            continue

        if job_status == "todo":
            if task.status != "queued":
                task.status = "queued"
                task.stage = "В очереди"
                task.message = "Ожидает запуска worker"
                changed += 1
            continue

        if job_status == "doing":
            if task.status != "running":
                task.status = "running"
                task.stage = task.stage or "Выполняется"
                task.message = task.message or "Задача обрабатывается worker"
                task.started_at = task.started_at or now
                changed += 1
            continue

        if job_status == "cancelled":
            task.status = "cancelled"
            task.stage = "Отменено"
            task.message = "Синхронизация после перезапуска"
            task.finished_at = task.finished_at or now
            task.cancelled_at = task.cancelled_at or now
            changed += 1
            continue

        if job_status == "succeeded":
            task.status = "failed"
            task.stage = "Результат потерян"
            task.message = "Синхронизация после перезапуска"
            task.error = (
                "Job завершилась успешно в Procrastinate, "
                "но локальная задача не была финализирована"
            )
            task.finished_at = now
            changed += 1
            continue

        if job_status in {"failed", "aborted"}:
            task.status = "failed"
            task.stage = "Прервано"
            task.message = "Синхронизация после перезапуска"
            task.error = f"Job в Procrastinate завершилась со статусом {job_status}"
            task.finished_at = now
            changed += 1
            continue

    if changed:
        await db.commit()

    return changed
