from datetime import datetime
from enum import StrEnum
from uuid import UUID

from _shared.schemas import FullName, Password, UpdateNotEmpty, Username
from pydantic import BaseModel, ConfigDict


class Role(StrEnum):
    operator = "operator"
    inspector = "inspector"
    admin = "admin"


class UserCreate(BaseModel):
    username: Username
    password: Password
    full_name: FullName
    role: Role = Role.operator


class UserUpdate(UpdateNotEmpty):
    username: Username | None = None
    password: Password | None = None
    full_name: FullName | None = None
    role: Role | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    id: UUID
    username: str
    full_name: str
    role: Role
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: Username
    password: Password
