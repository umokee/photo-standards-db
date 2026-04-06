from uuid import UUID

from exception import NotFoundError, ValidationError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import MlModel, TrainingTask
from .schemas import MlModelResponse, TrainingTaskResponse
from .weights import resolve_weights_path


async def get_models(
    db: AsyncSession,
    group_id: UUID,
) -> list[MlModelResponse]:
    models = await db.execute(
        select(MlModel)
        .where(MlModel.group_id == group_id, MlModel.trained_at.is_not(None))
        .order_by(MlModel.version.desc())
    )
    return models.scalars().all()


async def get_tasks(
    db: AsyncSession,
    group_id: UUID,
) -> list[TrainingTaskResponse]:
    tasks = await db.execute(
        select(TrainingTask)
        .where(TrainingTask.group_id == group_id)
        .order_by(TrainingTask.created_at.desc())
    )
    return tasks.scalars().all()


async def activate(
    db: AsyncSession,
    model_id: UUID,
) -> MlModelResponse:
    model = await db.get(MlModel, model_id)
    if not model:
        raise NotFoundError("Модель", model_id, "не найдена")

    if not model.trained_at:
        raise ValidationError("Активировать можно только успешно обученную модель")

    weights_path = resolve_weights_path(model.weights_path)
    if not weights_path.is_file():
        raise ValidationError("Невозможно активировать модель: файл весов не найден")

    await db.execute(
        update(MlModel)
        .where(MlModel.group_id == model.group_id)
        .values(is_active=False)
    )

    model.is_active = True
    await db.commit()
    await db.refresh(model)
    return model


async def get_task_status(
    db: AsyncSession,
    task_id: UUID,
) -> TrainingTaskResponse:
    task = await db.get(TrainingTask, task_id)
    if not task:
        raise NotFoundError("Задача", task_id, "не найдена")
    return task
