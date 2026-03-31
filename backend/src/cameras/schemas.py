from datetime import datetime
from uuid import UUID

from _shared.schemas import Name, UpdateNotEmpty, Url
from pydantic import BaseModel, ConfigDict


class CameraCreate(BaseModel):
    name: Name
    rtsp_url: Url
    resolution: str | None = None
    location: str | None = None


class CameraUpdate(UpdateNotEmpty):
    name: Name | None = None
    rtsp_url: Url | None = None
    resolution: str | None = None
    location: str | None = None
    is_active: bool | None = None


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
