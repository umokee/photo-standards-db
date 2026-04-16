from uuid import UUID

from app.dependencies import DbSession
from constants import inspections
from fastapi import APIRouter, File, Form, UploadFile

from . import service
from .schemas import InspectionResultResponse, InspectionStartResponse

router = APIRouter(prefix="/inspections", tags=["inspections"])


@router.post("/run", response_model=InspectionStartResponse, status_code=202)
async def run_inspection(
    db: DbSession,
    standard_id: UUID = Form(...),
    selected_segment_ids: list[UUID] = Form(...),
    camera_id: UUID | None = Form(None),
    mode: str = Form(inspections.modes.default),
    serial_number: str | None = Form(None),
    notes: str | None = Form(None),
    image: UploadFile = File(...),
) -> InspectionStartResponse:
    task = await service.start_inspection(
        db=db,
        standard_id=standard_id,
        selected_segment_ids=selected_segment_ids,
        camera_id=camera_id,
        mode=mode,
        serial_number=serial_number,
        notes=notes,
        image=image,
    )
    return InspectionStartResponse(
        task_id=task.id,
        status=task.status,
        message=task.message or "Проверка поставлена в очередь",
    )


@router.get("/{inspection_id}", response_model=InspectionResultResponse)
async def get_inspection(
    inspection_id: UUID,
    db: DbSession,
) -> InspectionResultResponse:
    return await service.get_inspection(db, inspection_id)
