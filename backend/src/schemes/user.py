from datetime import datetime
from typing import Annotated, Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, StringConstraints, model_validator

Role = Literal["operator", "inspector", "admin"]

Username = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=3,
        max_length=100,
        pattern=r"^[a-zA-Z0-9_.-]+$",
    ),
]
FullName = Annotated[
    str,
    StringConstraints(
        strip_whitespace=True,
        min_length=3,
        max_length=255,
    ),
]
Password = Annotated[
    str,
    StringConstraints(
        min_length=6,
        max_length=255,
    ),
]


class UserCreate(BaseModel):
    username: Username
    password: Password
    full_name: FullName
    role: Role = "operator"


class UserUpdate(BaseModel):
    username: Username | None = None
    password: Password | None = None
    full_name: FullName | None = None
    role: Role | None = None
    is_active: bool | None = None

    @model_validator(mode="after")
    def check_not_empty(self) -> "UserUpdate":
        if not self.model_dump(exclude_unset=True):
            raise ValueError("Необходимо передать хотя бы одно поле")
        return self


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
