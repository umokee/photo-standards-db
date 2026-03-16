from datetime import datetime
from typing import Annotated
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Name = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]
Url = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=500,
    ),
]
Location = Annotated[
    str | None,
    StringConstraints(
        strip_whitespace=True,
        min_length=1,
        max_length=255,
    ),
]


class CameraCreate(BaseModel):
    name: Name
    url: Url
    location: Location = None


class CameraUpdate(BaseModel):
    name: Name | None = None
    url: Url | None = None
    location: Location | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "CameraUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class CameraResponse(BaseModel):
    id: UUID
    name: str
    url: str
    location: str | None
    is_active: bool
    last_seen_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
