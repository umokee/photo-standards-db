from uuid import UUID

from app.dependencies import DbSession
from fastapi import APIRouter, Query

from .schemas import TaskCancelResponse, TaskResponse
from .service import cancel_task, get_task, list_tasks

router = APIRouter(prefix="/tasks", tags=["tasks"])


@router.get("", response_model=list[TaskResponse])
async def list_tasks_route(
    db: DbSession,
    group_id: UUID | None = Query(None),
    type: str | None = Query(None),
    status: str | None = Query(None),
    entity_type: str | None = Query(None),
    entity_id: UUID | None = Query(None),
) -> list[TaskResponse]:
    tasks = await list_tasks(
        db,
        group_id=group_id,
        type=type,
        status=status,
        entity_type=entity_type,
        entity_id=entity_id,
    )
    return [TaskResponse.model_validate(task) for task in tasks]


@router.get("/{task_id}", response_model=TaskResponse)
async def get_task_route(
    task_id: UUID,
    db: DbSession,
) -> TaskResponse:
    task = await get_task(db, task_id)
    return TaskResponse.model_validate(task)


@router.post("/{task_id}/cancel", response_model=TaskCancelResponse)
async def cancel_task_route(
    task_id: UUID,
    db: DbSession,
) -> TaskCancelResponse:
    task = await cancel_task(db, task_id=task_id)
    return TaskCancelResponse(task=TaskResponse.model_validate(task))
