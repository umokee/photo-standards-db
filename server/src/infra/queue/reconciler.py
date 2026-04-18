from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from enum import Enum
from typing import Any
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
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

logger = logging.getLogger(__name__)

IDLE_QUEUE_GRACE = timedelta(minutes=10)
QUEUED_DOING_TIMEOUT = timedelta(minutes=5)
HEARTBEAT_TIMEOUT = timedelta(minutes=10)
LIVE_STATUSES = {STATUS_QUEUED, STATUS_RUNNING, STATUS_RESUMING, STATUS_PAUSING}


class _Action(str, Enum):
    HEALTHY = "healthy"
    RECOVER = "recover"
    FAIL = "fail"


@dataclass(slots=True)
class _Decision:
    action: _Action
    reason: str = ""


async def reconcile_once() -> None:
    async with AsyncSessionLocal() as db:
        await _cross_check_with_procrastinate(db)
        await _resume_forgotten_paused_training(db)


async def _cross_check_with_procrastinate(db: AsyncSession) -> None:
    from infra.queue.procrastinate import procrastinate_app

    tasks_result = await db.execute(
        select(Task).where(
            Task.status.in_(LIVE_STATUSES),
            Task.external_job_id.is_not(None),
        )
    )
    tasks = [
        t
        for t in tasks_result.scalars().all()
        if t.external_job_id and t.external_job_id.isdigit()
    ]
    if not tasks:
        return

    try:
        all_jobs = list(await procrastinate_app.job_manager.list_jobs_async())
    except Exception:
        logger.exception("Reconciler: can't fetch procrastinate jobs")
        return

    jobs_by_id = {j.id: j for j in all_jobs}
    active_queues = {j.queue_name for j in all_jobs if j.status == "doing"}

    now = _now()
    for task in tasks:
        job = jobs_by_id.get(int(task.external_job_id))
        queue_name = (job.queue_name if job is not None else task.queue) or ""
        queue_is_idle = queue_name not in active_queues

        decision = _decide(task, job, now, queue_is_idle)

        if decision.action is _Action.HEALTHY:
            continue
        if decision.action is _Action.RECOVER:
            await _recover_or_fail(db, task, decision.reason)
        elif decision.action is _Action.FAIL:
            await _mark_failed(db, task.id, decision.reason)


def _decide(
    task: Task,
    job: Any | None,
    now: datetime,
    queue_is_idle: bool,
) -> _Decision:
    job_status = job.status if job is not None else None

    if task.status == STATUS_QUEUED:
        if job_status == "todo":
            if not queue_is_idle:
                return _Decision(_Action.HEALTHY)

            age = now - task.created_at
            if age > IDLE_QUEUE_GRACE:
                return _Decision(
                    _Action.FAIL,
                    "Очередь простаивает — задача не будет выполнена",
                )
            return _Decision(_Action.HEALTHY)

        if job_status == "doing":
            age = now - task.created_at
            if age > QUEUED_DOING_TIMEOUT:
                return _Decision(
                    _Action.FAIL,
                    "Воркер взял задачу, но не начал её выполнение",
                )
            return _Decision(_Action.HEALTHY)

        return _Decision(_Action.RECOVER, _terminal_job_reason(job_status))

    if job_status == "doing":
        if _heartbeat_fresh(task, now):
            return _Decision(_Action.HEALTHY)
        return _Decision(
            _Action.RECOVER,
            "Задача не подавала признаков жизни дольше допустимого",
        )

    if job_status == "todo":
        return _Decision(
            _Action.RECOVER,
            "Фоновая задача вернулась в очередь без завершения",
        )

    return _Decision(_Action.RECOVER, _terminal_job_reason(job_status))


def _heartbeat_fresh(task: Task, now: datetime) -> bool:
    last_signal = task.heartbeat_at or task.started_at or task.created_at
    return (now - last_signal) <= HEARTBEAT_TIMEOUT


def _terminal_job_reason(job_status: str | None) -> str:
    if job_status is None:
        return "Фоновая задача исчезла из очереди"
    return f"Фоновая задача завершилась со статусом {job_status}"


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
            "Reconciler: resuming training task %s from checkpoint (%s)",
            task.id,
            reason,
        )
        await schedule_training_resume(db, task)
    else:
        await _mark_failed(db, task.id, reason)


async def _mark_failed(db: AsyncSession, task_id: UUID, reason: str) -> None:
    logger.warning("Reconciler: failing task %s (%s)", task_id, reason)
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


@procrastinate_app.periodic(cron="*/2 * * * *")
@procrastinate_app.task(queue=CPU_QUEUE, queueing_lock="reconciler")
async def reconcile_tick(timestamp: int) -> None:
    await reconcile_once()
