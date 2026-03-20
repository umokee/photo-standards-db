from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StandardImageResponse(BaseModel):
    id: UUID
    image_path: str
    is_reference: bool
    segment_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StandardImageDetailResponse(StandardImageResponse):
    segments: list["SegmentResponse"]


from .segment import SegmentResponse

StandardImageDetailResponse.model_rebuild()
