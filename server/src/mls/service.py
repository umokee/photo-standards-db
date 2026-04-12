import datetime
from pathlib import Path
from uuid import UUID

from config import STORAGE_PATH
from exception import NotFoundError, ValidationError
from sqlalchemy import select, text, update
from sqlalchemy.ext.asyncio import AsyncSession
from tasks import training

from .models import MlModel
from .schemas import MlModelResponse

PENDING, PREPARING, TRAINING, SAVING, DONE, FAILED = training.statuses.all
BROKEN_JOB_STATUSES = {"failed", "cancelled", "aborted"}


async def _get_job_status(
    db: AsyncSession,
    job_id: int,
) -> str | None:
    result = await db.execute(
        text(
            """
            SELECT status::text AS status
            FROM procrastinate_jobs
            WHERE id = :job_id
            """
        ),
        {"job_id": job_id},
    )
    row = result.mappings().first()
    return row["status"] if row else None


def _mark_failed(model: MlModel, message: str) -> None:
    model.training_status = "failed"
    model.training_error = message[:500]
    model.training_finished_at = model.training_finished_at or datetime.now()
    model.training_job_id = None


async def _reconcile(
    db: AsyncSession,
    model: MlModel,
) -> None:
    if model.training_status not in training.statuses.active:
        return

    if model.training_job_id is None:
        return _mark_failed(model, "Задача обучения не найдена")

    status = await _get_job_status(db, model.training_job_id)

    match status:
        case None:
            _mark_failed(model, "Задача обучения не найдена в очереди")
        case "doing":
            pass
        case "todo":
            model.training_status = "pending"
            model.training_progress = None
            model.training_stage = None
        case "succeeded":
            _mark_failed(model, "Задача завершилась, но модель не обновлена")
        case s if s in BROKEN_JOB_STATUSES:
            _mark_failed(model, f"Задача завершилась со статусом: {s}")


async def get_models(
    db: AsyncSession,
    group_id: UUID,
) -> list[MlModelResponse]:
    result = await db.execute(
        select(MlModel)
        .where(MlModel.group_id == group_id)
        .order_by(MlModel.version.desc())
    )
    models = result.scalars().all()

    for model in models:
        await _reconcile(db, model)

    if db.dirty:
        await db.commit()

    return models


async def get_model(
    db: AsyncSession,
    model_id: UUID,
) -> MlModelResponse:
    model = await db.get(MlModel, model_id)
    if not model:
        raise NotFoundError("Модель", "ml_model", model_id)

    await _reconcile(db, model)
    if db.dirty:
        await db.commit()

    return model


async def activate(
    db: AsyncSession,
    model_id: UUID,
) -> MlModelResponse:
    model = await db.get(MlModel, model_id)
    if not model:
        raise NotFoundError("Модель", "ml_model", model_id)

    if not model.trained_at:
        raise ValidationError("Активировать можно только обученную модель")

    weights_path = STORAGE_PATH / Path(model.weights_path)
    if not weights_path.is_file():
        raise ValidationError("Файл весов не найден")

    await db.execute(
        update(MlModel)
        .where(MlModel.group_id == model.group_id)
        .values(is_active=False)
    )

    model.is_active = True
    await db.commit()
    await db.refresh(model)
    return model
