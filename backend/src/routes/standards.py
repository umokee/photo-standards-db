from pathlib import Path
from uuid import UUID

from config import STORAGE_PATH
from database import get_session
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from models.standard import Standard
from schemes.standard import (
    StandardResponse,
    StandardUpdate,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/standards", tags=["standards"])

ALLOWED_ANGLES = ["front", "top", "left", "right", "back"]


@router.get("/{standard_id}", response_model=StandardResponse)
async def get_standard(
    standard_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Standard)
        .options(selectinload(Standard.segments))
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")

    return standard


@router.post("", response_model=StandardResponse, status_code=201)
async def create_standard(
    group_id: UUID = Form(...),
    image: UploadFile = File(...),
    name: str | None = Form(None, min_length=1, max_length=255),
    angle: str = Form(...),
    db: AsyncSession = Depends(get_session),
):
    contents = await image.read()
    if image.content_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=422, detail="Invalid image type")
    if len(contents) > 20 * 1024 * 1024:
        raise HTTPException(status_code=422, detail="Invalid image size")
    if name:
        name = name.strip() or None
    if angle not in ALLOWED_ANGLES:
        raise HTTPException(status_code=422, detail="Invalid angle value")

    standard = Standard(
        group_id=group_id,
        name=name,
        image_path=image.filename,
        angle=angle,
    )
    db.add(standard)
    await db.flush()

    standard_id = standard.id

    suffix = Path(image.filename).suffix if image.filename else ".jpg"
    folder = STORAGE_PATH / "standards" / str(group_id)
    folder.mkdir(parents=True, exist_ok=True)
    file_path = folder / f"{standard_id}{suffix}"
    file_path.write_bytes(contents)

    standard.image_path = f"standards/{group_id}/{standard_id}{suffix}"
    await db.commit()

    result = await db.execute(
        select(Standard)
        .options(selectinload(Standard.segments))
        .where(Standard.id == standard_id)
    )
    return result.scalar_one()


@router.put("/{standard_id}", response_model=StandardResponse)
async def update_standard(
    standard_id: UUID,
    data: StandardUpdate,
    db: AsyncSession = Depends(get_session),
):
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")

    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(standard, key, value)

    await db.commit()
    await db.refresh(standard)

    result = await db.execute(
        select(Standard)
        .options(selectinload(Standard.segments))
        .where(Standard.id == standard_id)
    )
    return result.scalar_one()


@router.delete("/{standard_id}", status_code=204)
async def delete_standard(
    standard_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    standard = await db.get(Standard, standard_id)
    if not standard:
        raise HTTPException(status_code=404, detail="Standard not found")

    if standard.image_path:
        file_path = STORAGE_PATH / standard.image_path
        if file_path.exists():
            file_path.unlink()

    await db.delete(standard)
    await db.commit()
