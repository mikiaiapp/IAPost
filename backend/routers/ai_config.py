"""AI configuration router - manage API keys per provider."""
from typing import Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_active_user
from core.encryption import encrypt_api_key, decrypt_api_key
from models.user import User
from models.ai_key import AIKey, AIProvider
from services.ai_service import validate_api_key

router = APIRouter()


class AIKeyCreate(BaseModel):
    provider: str
    api_key: str
    preferred_model: Optional[str] = None


class AIKeyUpdate(BaseModel):
    api_key: Optional[str] = None
    preferred_model: Optional[str] = None
    is_active: Optional[bool] = None


@router.get("/keys")
async def list_keys(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIKey).where(AIKey.user_id == current_user.id)
    )
    keys = result.scalars().all()
    return [
        {
            "id": k.id,
            "provider": k.provider.value,
            "is_active": k.is_active,
            "preferred_model": k.preferred_model,
            "is_valid": k.is_valid,
            "validation_message": k.validation_message,
            "last_validated": k.last_validated.isoformat() if k.last_validated else None,
            "has_key": bool(k.encrypted_key),
        }
        for k in keys
    ]


@router.post("/keys", status_code=201)
async def create_key(
    payload: AIKeyCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    # Check if key for this provider exists
    result = await db.execute(
        select(AIKey).where(AIKey.user_id == current_user.id, AIKey.provider == AIProvider(payload.provider))
    )
    existing = result.scalar_one_or_none()

    encrypted = encrypt_api_key(payload.api_key)

    if existing:
        existing.encrypted_key = encrypted
        existing.preferred_model = payload.preferred_model
        existing.is_active = True
    else:
        key = AIKey(
            user_id=current_user.id,
            provider=AIProvider(payload.provider),
            encrypted_key=encrypted,
            preferred_model=payload.preferred_model,
        )
        db.add(key)

    await db.commit()
    return {"message": f"Clave para {payload.provider} guardada correctamente."}


@router.post("/keys/{provider}/test")
async def test_key(
    provider: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIKey).where(
            AIKey.user_id == current_user.id,
            AIKey.provider == AIProvider(provider),
        )
    )
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="No hay clave configurada para este proveedor")

    api_key = decrypt_api_key(key_obj.encrypted_key)
    is_valid, message, models = await validate_api_key(provider, api_key)

    key_obj.is_valid = is_valid
    key_obj.validation_message = message
    key_obj.last_validated = datetime.now(timezone.utc)
    await db.commit()

    return {"is_valid": is_valid, "message": message, "models": models[:20]}


@router.get("/models/{provider}")
async def list_provider_models(
    provider: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from services.ai_service import list_models

    result = await db.execute(
        select(AIKey).where(
            AIKey.user_id == current_user.id,
            AIKey.provider == AIProvider(provider),
        )
    )
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="No hay clave configurada para este proveedor")

    api_key = decrypt_api_key(key_obj.encrypted_key)
    models = await list_models(provider, api_key)
    return {"provider": provider, "models": models}


@router.put("/keys/{provider}/preferred-model")
async def set_preferred_model(
    provider: str,
    model_id: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIKey).where(
            AIKey.user_id == current_user.id,
            AIKey.provider == AIProvider(provider),
        )
    )
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    key_obj.preferred_model = model_id
    await db.commit()
    return {"message": f"Modelo preferido actualizado a {model_id}"}


@router.delete("/keys/{provider}", status_code=204)
async def delete_key(
    provider: str,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AIKey).where(
            AIKey.user_id == current_user.id,
            AIKey.provider == AIProvider(provider),
        )
    )
    key_obj = result.scalar_one_or_none()
    if not key_obj:
        raise HTTPException(status_code=404, detail="Proveedor no encontrado")
    await db.delete(key_obj)
    await db.commit()
