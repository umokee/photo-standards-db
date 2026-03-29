from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import (
    BaseModel,
    ConfigDict,
    StringConstraints,
    model_validator,
)

Name = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


class GroupCreate(BaseModel):
    name: Name
    description: str | None = None


class GroupUpdate(BaseModel):
    name: Name | None = None
    description: str | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "GroupUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class GroupResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    standards_count: int = 0
    images_count: int = 0

    model_config = ConfigDict(from_attributes=True)


class GroupDetailResponse(GroupResponse):
    standards: list["StandardResponse"]
    active_model: "MlModelResponse | None"


from ..mls.schemes import MlModelResponse
from ..standards.schemas import StandardResponse

GroupDetailResponse.model_rebuild()
