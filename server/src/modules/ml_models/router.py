from uuid import UUID

from app.dependencies import DbSession
from fastapi import APIRouter

from . import service
from .schemas import MlModelResponse

router = APIRouter(prefix="/models", tags=["models"])


@router.get("/{model_id}", response_model=MlModelResponse)
async def get_model(
    model_id: UUID,
    db: DbSession,
) -> MlModelResponse:
    model = await service.get_model(db, model_id)
    return MlModelResponse.model_validate(model)


@router.get("", response_model=list[MlModelResponse])
async def get_models(
    group_id: UUID,
    db: DbSession,
) -> list[MlModelResponse]:
    models = await service.get_models(db, group_id)
    return [MlModelResponse.model_validate(model) for model in models]


@router.put("/{model_id}/activate", response_model=MlModelResponse)
async def activate(
    model_id: UUID,
    db: DbSession,
) -> MlModelResponse:
    model = await service.activate(db, model_id)
    return MlModelResponse.model_validate(model)


@router.delete("/{model_id}", status_code=204)
async def delete_model_route(
    model_id: UUID,
    db: DbSession,
) -> None:
    await service.delete_model(db, model_id)
