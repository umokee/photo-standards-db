from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from . import service, train_service
from .schemas import MlModelResponse, MlModelTrainRequest, TrainingTaskResponse

router = APIRouter(prefix="/models", tags=["models"])


@router.get("", response_model=list[MlModelResponse])
async def get_models(
    group_id: UUID,
    db: AsyncSession = Depends(get_session),
) -> list[MlModelResponse]:
    return await service.get_models(db, group_id)


@router.post("/train", response_model=TrainingTaskResponse, status_code=201)
async def train(
    data: MlModelTrainRequest,
    db: AsyncSession = Depends(get_session),
) -> TrainingTaskResponse:
    return await train_service.run_train(db, data)


@router.put("/{model_id}/activate", response_model=MlModelResponse)
async def activate(
    model_id: UUID,
    db: AsyncSession = Depends(get_session),
) -> MlModelResponse:
    return await service.activate(db, model_id)


@router.get("/tasks/{task_id}", response_model=TrainingTaskResponse)
async def get_task_status(
    task_id: UUID,
    db: AsyncSession = Depends(get_session),
) -> TrainingTaskResponse:
    return await service.get_task_status(db, task_id)
