from infra.queue.procrastinate import procrastinate_app

from .service import run_inspection_task


@procrastinate_app.task(queue="gpu")
async def execute_inspection(*, task_id: str) -> None:
    await run_inspection_task(task_id)
