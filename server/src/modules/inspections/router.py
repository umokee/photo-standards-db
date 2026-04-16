from uuid import UUID

from app.dependencies import DbSession
from constants import inspections
from fastapi import APIRouter, File, Form, UploadFile

from . import service
from .schemas import (
    InspectionResultResponse,
    InspectionSaveRequest,
    InspectionSaveResponse,
    InspectionStartResponse,
)

router = APIRouter(prefix="/inspections", tags=["inspections"])


@router.post("/run", response_model=InspectionStartResponse, status_code=202)
async def run_inspection(
    db: DbSession,
    standard_id: UUID = Form(...),
    selected_segment_class_ids: list[UUID] = Form(...),
    camera_id: UUID | None = Form(None),
    mode: str = Form(inspections.modes.default),
    serial_number: str | None = Form(None),
    notes: str | None = Form(None),
    image: UploadFile = File(...),
) -> InspectionStartResponse:
    task = await service.start_inspection(
        db=db,
        standard_id=standard_id,
        selected_segment_class_ids=selected_segment_class_ids,
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
    inspection = await service.get_inspection(db, inspection_id)
    return InspectionResultResponse.model_validate(inspection)


@router.post("/save", response_model=InspectionSaveResponse)
async def save_inspection(
    payload: InspectionSaveRequest,
    db: DbSession,
) -> InspectionSaveResponse:
    inspection = await service.save_inspection_result(
        db,
        task_id=payload.task_id,
        serial_number=payload.serial_number,
        notes=payload.notes,
    )
    return InspectionSaveResponse(
        inspection_id=inspection.id,
        status=inspection.status,
        message="Результат проверки сохранён",
    )
