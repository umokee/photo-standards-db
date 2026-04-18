from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from uuid import UUID

from app.db import AsyncSessionLocal
from infra.storage.file_storage import resolve_storage_path
from modules.tasks.constants import (
    CPU_QUEUE,
    STATUS_FAILED,
    STATUS_PAUSED,
    STATUS_PAUSING,
    STATUS_QUEUED,
    STATUS_RESUMING,
    STATUS_RUNNING,
    TASK_TRAINING,
)
from modules.tasks.models import Task
from modules.tasks.service import update_task_status
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

HEARTBEAT_TIMEOUT = timedelta(minutes=10)
QUEUED_TIMEOUT = timedelta(hours=1)


async def reconcile_once() -> None:
    async with AsyncSessionLocal() as db:
        await _recover_lost_jobs(db)
        await _recover_stale_heartbeats(db)
        await _fail_stuck_queued(db)
        await _resume_forgotten_paused_training(db)


async def _recover_lost_jobs(db: AsyncSession) -> None:
    from infra.queue.procrastinate import procrastinate_app

    live = {STATUS_QUEUED, STATUS_RUNNING, STATUS_RESUMING, STATUS_PAUSING}
    result = await db.execute(
        select(Task).where(
            Task.status.in_(live),
            Task.external_job_id.is_not(None),
        )
    )
    for task in result.scalars().all():
        if not (task.external_job_id and task.external_job_id.isdigit()):
            continue

        job_id = int(task.external_job_id)
        try:
            jobs = await procrastinate_app.job_manager.list_jobs_async(id=job_id)
            job = next(iter(jobs), None)
        except Exception:
            logger.exception(
                "Reconciler: failed to query procrastinate for job %s", job_id
            )
            continue

        if job is None:
            await _recover_or_fail(db, task, "Фоновая задача исчезла из очереди")
        elif job.status in {"failed", "cancelled", "aborted"}:
            await _recover_or_fail(
                db, task, f"Фоновая задача завершилась в состоянии {job.status}"
            )


async def _recover_stale_heartbeats(db: AsyncSession) -> None:
    threshold = _now() - HEARTBEAT_TIMEOUT
    result = await db.execute(
        select(Task).where(
            Task.status.in_({STATUS_RUNNING, STATUS_RESUMING, STATUS_PAUSING}),
            or_(Task.heartbeat_at.is_(None), Task.heartbeat_at < threshold),
        )
    )
    for task in result.scalars().all():
        await _recover_or_fail(
            db, task, "Задача не подавала признаков жизни дольше допустимого"
        )


async def _fail_stuck_queued(db: AsyncSession) -> None:
    threshold = _now() - QUEUED_TIMEOUT
    result = await db.execute(
        select(Task).where(
            Task.status == STATUS_QUEUED,
            Task.created_at < threshold,
        )
    )
    for task in result.scalars().all():
        await _mark_failed(
            db, task.id, "Задача зависла в очереди и не была взята воркером"
        )


async def _resume_forgotten_paused_training(db: AsyncSession) -> None:
    from infra.queue.scheduler import maybe_resume_paused_training

    result = await db.execute(
        select(Task)
        .where(
            Task.type == TASK_TRAINING,
            Task.status == STATUS_PAUSED,
            Task.auto_resume.is_(True),
        )
        .limit(1)
    )
    if result.scalar_one_or_none() is not None:
        await maybe_resume_paused_training(db)


async def _recover_or_fail(db: AsyncSession, task: Task, reason: str) -> None:
    if _can_resume_training(task):
        from infra.queue.scheduler import schedule_training_resume

        logger.info(
            "Reconciler resuming %s task %s from checkpoint (%s)",
            task.type,
            task.id,
            reason,
        )
        await schedule_training_resume(db, task)
    else:
        await _mark_failed(db, task.id, reason)


async def _mark_failed(db: AsyncSession, task_id: UUID, reason: str) -> None:
    logger.warning("Reconciler failing task %s: %s", task_id, reason)
    await update_task_status(
        db,
        task_id=task_id,
        status=STATUS_FAILED,
        stage="Ошибка",
        message="Восстановление: задача признана потерянной",
        error=reason,
    )


def _can_resume_training(task: Task) -> bool:
    if task.type != TASK_TRAINING:
        return False
    if not task.auto_resume:
        return False
    if not task.checkpoint_path:
        return False
    return resolve_storage_path(task.checkpoint_path).exists()


def _now() -> datetime:
    return datetime.now(UTC).replace(tzinfo=None)


from infra.queue.procrastinate import procrastinate_app  # noqa: E402


@procrastinate_app.periodic(cron="*/2 * * * *")  # every 2 minutes
@procrastinate_app.task(
    queue=CPU_QUEUE,
    queueing_lock="reconciler",
)
async def reconcile_tick(timestamp: int) -> None:
    await reconcile_once()
