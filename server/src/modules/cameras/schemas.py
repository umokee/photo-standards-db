from datetime import datetime
from typing import Annotated, Self
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


class CameraCreate(BaseModel):
    name: Name
    rtsp_url: Url
    resolution: str | None = None
    location: str | None = None


class CameraUpdate(BaseModel):
    name: Name | None = None
    rtsp_url: Url | None = None
    resolution: str | None = None
    location: str | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def validate_not_empty(self) -> Self:
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


class CameraResponse(BaseModel):
    id: UUID
    name: str
    rtsp_url: str
    resolution: str | None
    location: str | None
    is_active: bool
    last_seen_at: datetime | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
