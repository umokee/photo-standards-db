from app.dependencies import DbSession
from fastapi import APIRouter

from .schemas import TrainingStartResponse, TrainRequest
from .service import start_training

router = APIRouter(prefix="/models", tags=["training"])


@router.post("/train", response_model=TrainingStartResponse, status_code=202)
async def train_model(
    data: TrainRequest,
    db: DbSession,
) -> TrainingStartResponse:
    task, model = await start_training(
        db,
        data,
    )
    return TrainingStartResponse(
        task_id=task.id,
        model_id=model.id,
    )
