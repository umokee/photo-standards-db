from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InspectionStartResponse(BaseModel):
    task_id: UUID
    status: str
    message: str


class InspectionCountDetailResponse(BaseModel):
    # Для status="extra" класс может отсутствовать в БД, поэтому допускаем строку.
    segment_class_id: UUID | str | None = None
    segment_class_group_id: UUID | str | None = None
    class_key: str
    name: str
    hue: int | None = None

    expected_count: int
    detected_count: int
    delta: int
    # ok | less | more | extra
    # - ok:    expected == detected
    # - less:  detected < expected
    # - more:  detected > expected (этого класса ждали, но нашли больше)
    # - extra: класс не ожидался на этом ракурсе, но был найден
    status: str

    confidence: float | None = None
    detections: list[dict] = Field(default_factory=list)


class InspectionTaskResultResponse(BaseModel):
    task_id: UUID
    inspection_id: UUID | None = None
    status: str
    matched: int
    total: int
    missing: list[str]
    details: list[InspectionCountDetailResponse]
    mode: str
    model_name: str | None = None


class InspectionSaveRequest(BaseModel):
    task_id: UUID
    serial_number: str | None = None
    notes: str | None = None


class InspectionSaveResponse(BaseModel):
    inspection_id: UUID
    status: str
    message: str


class InspectionResultResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    standard_id: UUID | None
    model_id: UUID | None
    camera_id: UUID | None
    user_id: UUID | None
    image_path: str
    result_image_path: str | None
    status: str
    mode: str
    total_segments: int
    matched_segments: int
    serial_number: str | None
    notes: str | None
    inspected_at: datetime
