from datetime import datetime
from typing import Literal
from uuid import UUID, uuid4

import sqlalchemy
from database import Base
from sqlalchemy import String, func
from sqlalchemy.orm import Mapped, mapped_column

Role = Literal["operator", "inspector", "admin"]


class User(Base):
    __tablename__ = "users"

    id: Mapped[UUID] = mapped_column(default=uuid4, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(255))
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[Role] = mapped_column(
        sqlalchemy.Enum("operator", "inspector", "admin", name="role_enum"),
        default="operator",
    )
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
