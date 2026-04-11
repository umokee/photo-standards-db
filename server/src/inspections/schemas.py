from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class InspectionSegmentDetail(BaseModel):
    segment_group_id: UUID | None = None
    name: str
    is_found: bool
    confidence: float = Field(ge=0, le=1)


class InspectionRunResponse(BaseModel):
    inspection_id: UUID
    status: str
    matched: int = Field(ge=0)
    total: int = Field(ge=0)
    missing: list[str]
    details: list[InspectionSegmentDetail]
    mode: str
    model_name: str | None = None

    model_config = ConfigDict(from_attributes=True)


class InspectionResponse(BaseModel):
    id: UUID
    standard_id: UUID | None
    model_id: UUID | None
    image_path: str
    result_image_path: str | None
    status: str
    mode: str
    total_segments: int
    matched_segments: int
    serial_number: str | None
    notes: str | None
    inspected_at: datetime

    model_config = ConfigDict(from_attributes=True)


class InspectionDetailResponse(InspectionResponse):
    segment_results: list[InspectionSegmentDetail]
