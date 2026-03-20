from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends, File, Form, UploadFile
from schemes.standard_image import (
    StandardImageDetailResponse,
    StandardImageResponse,
)
from services import standard_service
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(tags=["images"])


@router.post(
    "/standards/{standard_id}/images",
    response_model=StandardImageResponse,
    status_code=201,
)
async def upload_image(
    standard_id: UUID,
    image: UploadFile = File(...),
    is_reference: bool = Form(False),
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.upload_image(db, standard_id, image, is_reference)


@router.post(
    "/standards/{standard_id}/images/batch",
    response_model=list[StandardImageResponse],
    status_code=201,
)
async def upload_images(
    standard_id: UUID,
    images: list[UploadFile] = File(...),
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.upload_images(db, standard_id, images)


@router.patch("/images/{image_id}/reference", response_model=StandardImageResponse)
async def set_reference(
    image_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.set_reference(db, image_id)


@router.get("/images/{image_id}", response_model=StandardImageDetailResponse)
async def get_image(
    image_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.get_image(db, image_id)


@router.delete("/images/{image_id}", status_code=204)
async def delete_image(
    image_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    return await standard_service.delete_image(db, image_id)
