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
Description = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=2000,
    ),
]


class GroupCreate(BaseModel):
    name: Name
    description: Description = None


class GroupUpdate(BaseModel):
    name: Name | None = None
    description: Description = None

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

    model_config = ConfigDict(from_attributes=True)


class GroupDetailResponse(BaseModel):
    id: UUID
    name: str
    description: str | None
    created_at: datetime
    standards: list["StandardShortResponse"]
    # active_model: "MlModelShortResponse | None"

    model_config = ConfigDict(from_attributes=True)


from .ml_model import MlModelShortResponse
from .standard import StandardShortResponse

GroupDetailResponse.model_rebuild()
