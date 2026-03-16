from uuid import UUID

import bcrypt
from database import get_session
from fastapi import APIRouter, Depends, HTTPException
from models.user import User
from schemes.user import UserCreate, UserResponse, UserUpdate
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserResponse])
async def list_users(
    db: AsyncSession = Depends(get_session),
):
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.post("", response_model=UserResponse, status_code=201)
async def create_user(
    data: UserCreate,
    db: AsyncSession = Depends(get_session),
):
    data_dict = data.model_dump()
    data_dict["password_hash"] = bcrypt.hashpw(
        data_dict.pop("password").encode(), bcrypt.gensalt()
    ).decode()
    user = User(**data_dict)
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: UUID,
    data: UserUpdate,
    db: AsyncSession = Depends(get_session),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

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


@router.delete("/{user_id}", status_code=204)
async def delete_user(
    user_id: UUID,
    db: AsyncSession = Depends(get_session),
):
    user = await db.get(User, user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user)
    await db.commit()
