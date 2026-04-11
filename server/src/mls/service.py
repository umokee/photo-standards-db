from pathlib import Path
from uuid import UUID

from config import STORAGE_PATH
from exception import NotFoundError, ValidationError
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import MlModel
from .schemas import MlModelResponse


async def get_models(
    db: AsyncSession,
    group_id: UUID,
) -> list[MlModelResponse]:
    models = await db.execute(
        select(MlModel)
        .where(MlModel.group_id == group_id)
        .order_by(MlModel.version.desc())
    )
    return models.scalars().all()


async def get_model(
    db: AsyncSession,
    model_id: UUID,
) -> MlModelResponse:
    model = await db.get(MlModel, model_id)
    if not model:
        raise NotFoundError("Модель", "ml_model", model_id)
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
