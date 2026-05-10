"""Sources router - CRUD for RSS/URL feeds."""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
from core.security import get_current_active_user
from models.user import User
from models.source import Source, SourceCategory, SourceType

router = APIRouter()


class SourceCreate(BaseModel):
    name: str
    url: str
    source_type: str = "rss"
    category: str = "economics"


class SourceUpdate(BaseModel):
    name: Optional[str] = None
    url: Optional[str] = None
    is_active: Optional[bool] = None
    source_type: Optional[str] = None
    category: Optional[str] = None


@router.get("/")
async def list_sources(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Source).where(Source.user_id == current_user.id).order_by(Source.category, Source.name)
    )
    sources = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "url": s.url,
            "source_type": s.source_type.value,
            "category": s.category.value,
            "is_active": s.is_active,
            "last_tested": s.last_tested.isoformat() if s.last_tested else None,
            "last_test_status": s.last_test_status,
            "last_test_message": s.last_test_message,
        }
        for s in sources
    ]


@router.post("/", status_code=201)
async def create_source(
    payload: SourceCreate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    source = Source(
        user_id=current_user.id,
        name=payload.name,
        url=payload.url,
        source_type=SourceType(payload.source_type),
        category=SourceCategory(payload.category),
    )
    db.add(source)
    await db.commit()
    return {"id": source.id, "message": "Fuente creada."}


@router.put("/{source_id}")
async def update_source(
    source_id: int,
    payload: SourceUpdate,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Source).where(Source.id == source_id, Source.user_id == current_user.id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Fuente no encontrada")

    if payload.name is not None:
        source.name = payload.name
    if payload.url is not None:
        source.url = payload.url
    if payload.is_active is not None:
        source.is_active = payload.is_active
    if payload.source_type is not None:
        source.source_type = SourceType(payload.source_type)
    if payload.category is not None:
        source.category = SourceCategory(payload.category)

    await db.commit()
    return {"message": "Fuente actualizada."}


@router.delete("/{source_id}", status_code=204)
async def delete_source(
    source_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Source).where(Source.id == source_id, Source.user_id == current_user.id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Fuente no encontrada")
    await db.delete(source)
    await db.commit()


@router.post("/{source_id}/test")
async def test_source(
    source_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    from services.scraper_service import test_source as do_test

    result = await db.execute(
        select(Source).where(Source.id == source_id, Source.user_id == current_user.id)
    )
    source = result.scalar_one_or_none()
    if not source:
        raise HTTPException(status_code=404, detail="Fuente no encontrada")

    ok, message, items = await do_test(source.url, source.source_type.value)
    source.last_tested = datetime.now(timezone.utc)
    source.last_test_status = "ok" if ok else "error"
    source.last_test_message = message
    await db.commit()

    return {"ok": ok, "message": message, "items": items[:3]}
