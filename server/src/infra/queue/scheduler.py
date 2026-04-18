from __future__ import annotations

import logging
from uuid import UUID

from app.exception import ConflictError
from modules.tasks.constants import (
    ACTIVE_STATUSES,
    GPU_QUEUE,
    PRIORITY_INSPECTION,
    PRIORITY_TRAINING,
    PRIORITY_TRAINING_RESUME,
    STATUS_PAUSED,
    STATUS_PAUSING,
    STATUS_QUEUED,
    STATUS_RESUMING,
    STATUS_RUNNING,
    TASK_INSPECTION,
    TASK_TRAINING,
)
from modules.tasks.models import Task
from modules.tasks.service import update_task_status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)


async def ensure_no_active_task_for_group(
    db: AsyncSession, *, group_id: UUID, type: str
) -> None:
    blocking = ACTIVE_STATUSES | {STATUS_PAUSED}
    result = await db.execute(
        select(Task)
        .where(
            Task.group_id == group_id,
            Task.type == type,
            Task.status.in_(blocking),
        )
        .limit(1)
    )
    if result.scalar_one_or_none() is not None:
        raise ConflictError("Для этой группы уже есть активная задача этого типа")


async def schedule_training(
    db: AsyncSession,
    task: Task,
) -> Task:
    from modules.training.jobs import execute_training

    job = await execute_training.configure(
        queue=GPU_QUEUE,
        priority=PRIORITY_TRAINING,
        queueing_lock=f"train:{task.group_id}",
    ).defer_async(task_id=str(task.id))

    return await update_task_status(
        db,
        task_id=task.id,
        status=STATUS_QUEUED,
        stage="В очереди",
        message="Обучение поставлено в GPU-очередь",
        external_job_id=str(job.id),
    )


async def schedule_inspection(
    db: AsyncSession,
    task: Task,
) -> Task:
    from modules.inspections.jobs import execute_inspection

    job = await execute_inspection.configure(
        queue=GPU_QUEUE,
        priority=PRIORITY_INSPECTION,
    ).defer_async(task_id=str(task.id))

    return await update_task_status(
        db,
        task_id=task.id,
        status=STATUS_QUEUED,
        stage="В очереди",
        message="Проверка поставлена в GPU-очередь",
        external_job_id=str(job.id),
    )


async def schedule_training_resume(
    db: AsyncSession,
    task: Task,
) -> Task:
    from modules.training.jobs import execute_training

    job = await execute_training.configure(
        queue=GPU_QUEUE,
        priority=PRIORITY_TRAINING_RESUME,
        queueing_lock=f"resume:{task.id}",
    ).defer_async(task_id=str(task.id))

    task.abort_requested = False
    return await update_task_status(
        db,
        task_id=task.id,
        status=STATUS_QUEUED,
        stage="В очереди",
        message="Возобновление после паузы",
        external_job_id=str(job.id),
    )


async def request_training_pause_for_inspection(
    db: AsyncSession,
) -> Task | None:
    result = await db.execute(
        select(Task)
        .where(
            Task.type == TASK_TRAINING,
            Task.queue == GPU_QUEUE,
            Task.status.in_({STATUS_RUNNING, STATUS_RESUMING, STATUS_PAUSING}),
        )
        .order_by(Task.created_at.asc())
        .limit(1)
    )
    task = result.scalar_one_or_none()
    if task is None:
        return None

    task.abort_requested = True
    task.auto_resume = True
    task.status = STATUS_PAUSING
    task.stage = "Останавливаем обучение"
    task.message = "Обучение приостановлено ради приоритетной проверки"

    if _has_queue_job(task):
        await cancel_procrastinate_job(int(task.external_job_id))

    await db.commit()
    await db.refresh(task)
    return task


async def maybe_resume_paused_training(
    db: AsyncSession,
    *,
    exclude_inspection_task_id: UUID | None = None,
) -> Task | None:
    active_inspections = await _count_active_inspections(
        db, exclude_task_id=exclude_inspection_task_id
    )
    if active_inspections > 0:
        return None

    result = await db.execute(
        select(Task)
        .where(
            Task.type == TASK_TRAINING,
            Task.queue == GPU_QUEUE,
            Task.status == STATUS_PAUSED,
            Task.auto_resume.is_(True),
        )
        .order_by(Task.created_at.asc())
        .limit(1)
    )
    task = result.scalar_one_or_none()
    if task is None:
        return None
    return await schedule_training_resume(db, task)


async def cancel_procrastinate_job(job_id: int) -> None:
    try:
        from infra.queue.procrastinate import procrastinate_app

        await procrastinate_app.job_manager.cancel_job_by_id_async(job_id, abort=True)
    except Exception:
        logger.warning("Could not cancel procrastinate job %s", job_id, exc_info=True)


async def _count_active_inspections(
    db: AsyncSession,
    *,
    exclude_task_id: UUID | None = None,
) -> int:
    stmt = select(Task).where(
        Task.type == TASK_INSPECTION,
        Task.queue == GPU_QUEUE,
        Task.status.in_(ACTIVE_STATUSES),
    )
    if exclude_task_id is not None:
        stmt = stmt.where(Task.id != exclude_task_id)
    result = await db.execute(stmt)
    return len(list(result.scalars().all()))


def _has_queue_job(
    task: Task,
) -> bool:
    return bool(task.external_job_id and task.external_job_id.isdigit())
