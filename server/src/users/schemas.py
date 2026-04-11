from datetime import datetime
from uuid import UUID

from _shared.constants import users
from _shared.schemas import FullName, Password, UpdateNotEmpty, Username
from pydantic import BaseModel, ConfigDict, field_validator


class UserCreate(BaseModel):
    username: Username
    password: Password
    full_name: FullName
    role: str = users.roles.default

    @field_validator("role")
    @classmethod
    def validate_role(cls, val: str) -> str:
        if val not in users.roles.all:
            raise ValueError(f"Роль должна быть одна из {', '.join(users.roles.all)}")
        return val


class UserUpdate(UpdateNotEmpty):
    username: Username | None = None
    password: Password | None = None
    full_name: FullName | None = None
    role: str | None = None
    is_active: bool | None = None

    @field_validator("role")
    @classmethod
    def validate_role(cls, val: str | None) -> str | None:
        if val is not None and val not in users.roles.all:
            raise ValueError(f"Роль должна быть одна из {', '.join(users.roles.all)}")
        return val


class UserResponse(BaseModel):
    id: UUID
    username: str
    full_name: str
    role: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class UserLogin(BaseModel):
    username: Username
    password: Password
