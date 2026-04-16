from uuid import UUID

from app.dependencies import DbSession
from fastapi import APIRouter, File, UploadFile

from . import service
from .schemas import (
    StandardCreate,
    StandardDetailResponse,
    StandardImageDetailResponse,
    StandardImageResponse,
    StandardMutationResponse,
    StandardUpdate,
)

router = APIRouter(prefix="/standards", tags=["standards"])


@router.get(
    "/{standard_id}",
    response_model=StandardDetailResponse,
)
async def get_standard(
    db: DbSession,
    standard_id: UUID,
) -> StandardDetailResponse:
    return await service.get_detail(db, standard_id)


@router.post(
    "",
    response_model=StandardMutationResponse,
    status_code=201,
)
async def create_standard(
    db: DbSession,
    data: StandardCreate,
) -> StandardMutationResponse:
    return await service.create(db, data)


@router.put(
    "/{standard_id}",
    response_model=StandardMutationResponse,
)
async def update_standard(
    db: DbSession,
    standard_id: UUID,
    data: StandardUpdate,
) -> StandardMutationResponse:
    return await service.update(db, standard_id, data)


@router.delete(
    "/{standard_id}",
    status_code=204,
)
async def delete_standard(
    db: DbSession,
    standard_id: UUID,
) -> None:
    await service.delete(db, standard_id)


@router.post(
    "/{standard_id}/images",
    response_model=list[StandardImageResponse],
    status_code=201,
)
async def upload_images(
    db: DbSession,
    standard_id: UUID,
    images: list[UploadFile] = File(...),  # noqa: B008
) -> list[StandardImageResponse]:
    return await service.upload_images(db, standard_id, images)


@router.patch(
    "/images/{image_id}/reference",
    response_model=StandardImageResponse,
)
async def set_reference(
    db: DbSession,
    image_id: UUID,
) -> StandardImageResponse:
    return await service.set_reference(db, image_id)


@router.get(
    "/images/{image_id}",
    response_model=StandardImageDetailResponse,
)
async def get_image(
    db: DbSession,
    image_id: UUID,
) -> StandardImageDetailResponse:
    return await service.get_image(db, image_id)


@router.delete(
    "/images/{image_id}",
    status_code=204,
)
async def delete_image(
    db: DbSession,
    image_id: UUID,
) -> None:
    await service.delete_image(db, image_id)
