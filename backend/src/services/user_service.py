from uuid import UUID

import bcrypt
from fastapi import HTTPException
from models.user import User
from schemes.user import UserCreate, UserUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession


async def get_users(
    db: AsyncSession,
) -> list[User]:
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


async def get_user(
    db: AsyncSession,
    user_id: UUID,
) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def create(
    db: AsyncSession,
    data: UserCreate,
) -> User:
    data_dict = data.model_dump()
    data_dict["password_hash"] = bcrypt.hashpw(
        data_dict.pop("password").encode(), bcrypt.gensalt()
    ).decode()
    user = User(**data_dict)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def update(
    db: AsyncSession,
    user_id: UUID,
    data: UserUpdate,
) -> User:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    for key, value in data.model_dump(exclude_unset=True).items():
        if key == "password":
            user.password_hash = bcrypt.hashpw(
                value.encode(), bcrypt.gensalt()
            ).decode()
        else:
            setattr(user, key, value)

    await db.commit()
    await db.refresh(user)
    return user


async def delete(
    db: AsyncSession,
    user_id: UUID,
) -> None:
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="Пользователь не найден")

    await db.delete(user)
    await db.commit()
