from app.db import AsyncSessionLocal
from infra.queue.procrastinate import procrastinate_app
from modules.tasks.service import (
    cleanup_old_terminal_tasks,
    maybe_resume_paused_training,
)


@procrastinate_app.periodic(cron="*/1 * * * *")
@procrastinate_app.task(
    queue="cpu", queueing_lock="retry_stalled_gpu_jobs", pass_context=True
)
async def retry_stalled_gpu_jobs(context, timestamp):
    stalled_jobs = await procrastinate_app.job_manager.get_stalled_jobs(queue="gpu")
    for job in stalled_jobs:
        await procrastinate_app.job_manager.retry_job(job)


@procrastinate_app.periodic(cron="*/5 * * * *")
@procrastinate_app.task(
    queue="cpu", queueing_lock="maybe_resume_training", pass_context=True
)
async def resume_paused_training(context, timestamp):
    async with AsyncSessionLocal() as db:
        await maybe_resume_paused_training(db)


@procrastinate_app.periodic(cron="0 4 * * *")
@procrastinate_app.task(queue="cpu", queueing_lock="cleanup_tasks", pass_context=True)
async def cleanup_tasks(context, timestamp):
    async with AsyncSessionLocal() as db:
        await cleanup_old_terminal_tasks(db, keep_days=30)
