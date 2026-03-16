from uuid import UUID

from database import get_session
from fastapi import APIRouter, Depends, HTTPException
from models.camera import Camera
from schemes.camera import CameraCreate, CameraResponse, CameraUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/cameras", tags=["cameras"])


@router.get("", response_model=list[CameraResponse])
async def list_cameras(
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(Camera).order_by(Camera.id))
    return result.scalars().all()


@router.post("", response_model=CameraResponse, status_code=201)
async def create_camera(
    data: CameraCreate,
    db: AsyncSession = Depends(get_session),
):
    camera = Camera(**data.model_dump())
    db.add(camera)
    await db.commit()
    await db.refresh(camera)
    return camera


@router.put("/{camera_id}", response_model=CameraResponse)
async def update_camera(
    camera_id: UUID,
    data: CameraUpdate,
    db: AsyncSession = Depends(get_session),
):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(camera, key, value)

    await db.commit()
    await db.refresh(camera)
    return camera


@router.delete("/{camera_id}", status_code=204)
async def delete_camera(
    camera_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    camera = await db.get(Camera, camera_id)
    if not camera:
        raise HTTPException(status_code=404, detail="Camera not found")

    await db.delete(camera)
    await db.commit()
