from pathlib import Path
from random import uniform
from uuid import UUID, uuid4

from config import STORAGE_PATH
from database import get_session
from exception import NotFoundError, ValidationError
from fastapi import APIRouter, Depends, File, Form, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload
from standards.models import Standard

from .models import InspectionResult, InspectionSegmentResult
from .schemas import (
    InspectionRunResponse,
    InspectionSegmentDetail,
)

router = APIRouter(prefix="/inspections", tags=["inspections"])


@router.post("/run", response_model=InspectionRunResponse)
async def run_inspection(
    standard_id: UUID = Form(...),
    camera_id: UUID | None = Form(None),
    mode: str = Form("photo"),
    image: UploadFile = File(...),
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(
        select(Standard)
        .options(selectinload(Standard.segments))
        .where(Standard.id == standard_id)
    )
    standard = result.scalar_one_or_none()
    if not standard:
        raise NotFoundError("Эталон", "standard", standard_id)
    if not standard.segments:
        raise ValidationError("У эталона нет сегментов")

    inspection_id = uuid4()
    suffix = Path(image.filename).suffix if image.filename else ".jpg"
    folder = STORAGE_PATH / "inspections"
    folder.mkdir(parents=True, exist_ok=True)
    file_path = folder / f"{inspection_id}{suffix}"
    file_path.write_bytes(await image.read())

    details = []
    for segment in standard.segments:
        confidence = round(uniform(0.1, 0.99), 2)
        found = confidence >= segment.confidence_threshold
        details.append(
            InspectionSegmentDetail(
                segment_id=segment.id,
                label=segment.label,
                found=found,
                confidence=confidence,
            )
        )

    matched = sum(1 for d in details if d.found)
    total = len(details)
    status = "passed" if matched == total else "failed"
    missing = [d.label for d in details if not d.found]

    inspection = InspectionResult(
        id=inspection_id,
        standard_id=standard.id,
        model_id=None,
        image_path=f"inspections/{inspection_id}{suffix}",
        status=status,
        mode=mode,
        total_segments=total,
        matched_segments=matched,
    )
    db.add(inspection)

    for d in details:
        db.add(
            InspectionSegmentResult(
                inspection_id=inspection_id,
                segment_id=d.segment_id,
                is_found=d.found,
                confidence=d.confidence,
            )
        )
    await db.commit()

    return InspectionRunResponse(
        inspection_id=inspection_id,
        status=status,
        matched=matched,
        total=total,
        missing=missing,
        details=details,
        mode=mode,
        model_name=None,
    )
