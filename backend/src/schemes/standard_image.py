from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class StandardImageResponse(BaseModel):
    id: UUID
    image_path: str
    is_reference: bool
    annotation_count: int = 0
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class StandardImageDetailResponse(StandardImageResponse):
    segments: list["SegmentWithPointsResponse"]


from .segment import SegmentWithPointsResponse

StandardImageDetailResponse.model_rebuild()
