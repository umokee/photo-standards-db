from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, StringConstraints, model_validator

Status = Literal["passed", "failed"]
Mode = Literal["photo", "snapshot", "realtime"]


ImagePath = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=500,
    ),
]
SerialNumber = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=100,
    ),
]
Label = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]
Notes = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=5000,
    ),
]


class InspectionRunRequest(BaseModel):
    standard_id: UUID
    camera_id: UUID | None = None
    image_path: ImagePath = None
    serial_number: SerialNumber = None
    mode: Mode = "photo"

    @model_validator(mode="after")
    def check_source(self) -> "InspectionRunRequest":
        if self.camera_id is None and self.image_path is None:
            raise ValueError("Укажите камеру или путь к изображению")
        return self


class InspectionSegmentDetail(BaseModel):
    segment_id: UUID
    label: Label
    found: bool
    confidence: float = Field(..., ge=0, le=1)


class InspectionRunResponse(BaseModel):
    inspection_id: UUID
    status: Status
    matched: int = Field(..., ge=0)
    total: int = Field(..., ge=0)
    missing: list[str]
    details: list[InspectionSegmentDetail]
    mode: Mode
    model_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InspectionResponse(BaseModel):
    id: UUID
    standard_id: UUID | None
    model_id: UUID | None
    image_path: str
    result_image_path: str | None
    status: Status
    mode: Mode
    total_segments: int
    matched_segments: int
    serial_number: str | None
    notes: str | None
    inspected_at: datetime

    model_config = ConfigDict(from_attributes=True)
