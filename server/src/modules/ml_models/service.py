from uuid import UUID

from app.exception import ConflictError, NotFoundError, ValidationError
from infra.storage.file_storage import resolve_storage_path
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from .models import MlModel


async def get_model(
    db: AsyncSession,
    model_id: UUID,
) -> MlModel:
    model = await db.get(MlModel, model_id)
    if not model:
        raise NotFoundError("Модель", model_id)
    return model


async def get_models(
    db: AsyncSession,
    group_id: UUID,
) -> list[MlModel]:
    result = await db.execute(
        select(MlModel)
        .where(MlModel.group_id == group_id)
        .order_by(MlModel.version.desc(), MlModel.created_at.desc())
    )
    return list(result.scalars().all())


async def activate(
    db: AsyncSession,
    model_id: UUID,
) -> MlModel:
    model = await db.get(MlModel, model_id)
    if model is None:
        raise NotFoundError("Модель", model_id)

    if not model.trained_at:
        raise ValidationError("Активировать можно только обученную модель")
    if not model.weights_path:
        raise ValidationError("У модели отсутствует путь к весам")
    if not resolve_storage_path(model.weights_path).is_file():
        raise ValidationError("Файл весов не найден")

    await db.execute(
        update(MlModel)
        .where(MlModel.group_id == model.group_id, MlModel.id != model.id)
        .values(is_active=False)
    )
    model.is_active = True
    await db.commit()
    await db.refresh(model)
    return model


async def delete_model(
    db: AsyncSession,
    model_id: UUID,
) -> None:
    model = await get_model(db, model_id)

    if model.is_active:
        raise ConflictError("Нельзя удалить активную модель")

    weights_path = (
        resolve_storage_path(model.weights_path) if model.weights_path else None
    )

    await db.delete(model)
    await db.commit()

    if weights_path and weights_path.is_file():
        weights_path.unlink(missing_ok=True)
