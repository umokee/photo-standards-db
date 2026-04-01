from datetime import datetime
from uuid import UUID

from _shared.schemas import Name, OptionalName, UpdateNotEmpty
from pydantic import (
    BaseModel,
    ConfigDict,
)


class GroupCreate(BaseModel):
    name: Name
    description: str | None = None


class GroupUpdate(UpdateNotEmpty):
    name: OptionalName
    description: str | None = None


class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    standards_count: int = 0
    images_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class GroupDetailResponse(GroupResponse):
    standards: list["StandardResponse"] = []
    active_model: "MlModelResponse | None" = None


from mls.schemas import MlModelResponse
from standards.schemas import StandardResponse

GroupDetailResponse.model_rebuild()
