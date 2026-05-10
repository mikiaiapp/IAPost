"""Users router - profile management."""
from typing import Optional
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from core.database import get_db
from core.security import get_current_active_user, get_password_hash
from models.user import User

router = APIRouter()


class UserProfile(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str]
    is_verified: bool
    totp_enabled: bool
    created_at: str


class UpdateProfileRequest(BaseModel):
    full_name: Optional[str] = None


@router.get("/me", response_model=UserProfile)
async def get_profile(current_user: User = Depends(get_current_active_user)):
    return UserProfile(
        id=current_user.id,
        email=current_user.email,
        username=current_user.username,
        full_name=current_user.full_name,
        is_verified=current_user.is_verified,
        totp_enabled=current_user.totp_enabled,
        created_at=current_user.created_at.isoformat(),
    )


@router.put("/me")
async def update_profile(
    payload: UpdateProfileRequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if payload.full_name is not None:
        current_user.full_name = payload.full_name
    await db.commit()
    return {"message": "Perfil actualizado."}
