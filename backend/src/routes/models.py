from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends, HTTPException
from models.ml_model import MlModel
from schemes.ml_model import MlModelResponse, MlModelTrainRequest
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/models", tags=["models"])


@router.post("/train", response_model=MlModelResponse, status_code=201)
async def train_model(
    data: MlModelTrainRequest,
    db: AsyncSession = Depends(get_session),
):
    pass


@router.get("", response_model=list[MlModelResponse])
async def list_models(
    group_id: UUID | None = None,
    db: AsyncSession = Depends(get_session),
):
    query = select(MlModel).order_by(MlModel.created_at.desc())
    if group_id:
        query = query.where(MlModel.group_id == group_id)
    result = await db.execute(query)
    return result.scalars().all()


@router.put("/{model_id}/activate", response_model=MlModelResponse)
async def activate_model(
    model_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    model = await db.get(MlModel, model_id)
    if not model:
        raise HTTPException(404, "Модель не найдена")

    result = await db.execute(
        select(MlModel).where(
            MlModel.group_id == model.group_id, MlModel.is_active == True
        )
    )
    for m in result.scalars().all():
        m.is_active = False

    model.is_active = True
    await db.commit()
    await db.refresh(model)
    return model
