from uuid import UUID

from app.dependencies import DbSession
from app.exception import NotFoundError
from fastapi import APIRouter
from sqlalchemy import select

from .models import Camera
from .schemas import CameraCreate, CameraResponse, CameraUpdate

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("", response_model=list[CameraResponse])
async def list_cameras(
    db: DbSession,
) -> CameraResponse:
    result = await db.execute(select(Camera).order_by(Camera.id))
    return result.scalars().all()


@router.post("", response_model=CameraResponse, status_code=201)
async def create_camera(
    db: DbSession,
    data: CameraCreate,
) -> CameraResponse:
    camera = Camera(**data.model_dump())
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    return camera


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    db: DbSession,
    camera_id: UUID,
    data: CameraUpdate,
) -> CameraResponse:
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise NotFoundError("Камера", "camera", camera_id)

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(camera, key, value)

    await db.commit()
    await db.refresh(camera)
    return camera


@router.delete("/{camera_id}", status_code=204)
async def delete_camera(
    db: DbSession,
    camera_id: UUID,
) -> None:
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise NotFoundError("Камера", "camera", camera_id)

    await db.delete(camera)
    await db.commit()
