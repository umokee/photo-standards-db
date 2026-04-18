from infra.queue.procrastinate import procrastinate_app

from .service import run_training_task


@procrastinate_app.task(queue="gpu")
async def execute_training(*, task_id: str) -> None:
    await run_training_task(task_id)
