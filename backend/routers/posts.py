"""Posts router - CRUD + generate"""
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc

from core.database import get_db
from core.security import get_current_active_user
from models.user import User
from models.post import Post, PostStatus

router = APIRouter()


class GenerateFromURLRequest(BaseModel):
    url: str


class PostResponse(BaseModel):
    id: int
    status: str
    post_type: str
    linkedin_post: Optional[str]
    infographic_prompt: Optional[str]
    economic_news_title: Optional[str]
    economic_news_url: Optional[str]
    ai_news_title: Optional[str]
    ephemeris: Optional[str]
    ai_provider: Optional[str]
    ai_model: Optional[str]
    error_message: Optional[str]
    created_at: str

    class Config:
        from_attributes = True


@router.get("/", response_model=list[PostResponse])
async def list_posts(
    limit: int = 20,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Post)
        .where(Post.user_id == current_user.id)
        .order_by(desc(Post.created_at))
        .limit(limit)
    )
    posts = result.scalars().all()
    return [
        PostResponse(
            id=p.id,
            status=p.status.value,
            post_type=p.post_type.value,
            linkedin_post=p.linkedin_post,
            infographic_prompt=p.infographic_prompt,
            economic_news_title=p.economic_news_title,
            economic_news_url=p.economic_news_url,
            ai_news_title=p.ai_news_title,
            ephemeris=p.ephemeris,
            ai_provider=p.ai_provider,
            ai_model=p.ai_model,
            error_message=p.error_message,
            created_at=p.created_at.isoformat(),
        )
        for p in posts
    ]


@router.get("/latest", response_model=Optional[PostResponse])
async def get_latest_post(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Post)
        .where(Post.user_id == current_user.id, Post.status == PostStatus.READY)
        .order_by(desc(Post.created_at))
        .limit(1)
    )
    post = result.scalar_one_or_none()
    if not post:
        return None
    return PostResponse(
        id=post.id,
        status=post.status.value,
        post_type=post.post_type.value,
        linkedin_post=post.linkedin_post,
        infographic_prompt=post.infographic_prompt,
        economic_news_title=post.economic_news_title,
        economic_news_url=post.economic_news_url,
        ai_news_title=post.ai_news_title,
        ephemeris=post.ephemeris,
        ai_provider=post.ai_provider,
        ai_model=post.ai_model,
        error_message=post.error_message,
        created_at=post.created_at.isoformat(),
    )


@router.post("/generate", status_code=202)
async def trigger_generation(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
):
    """Manually trigger daily content generation."""
    from services.content_pipeline import generate_content_for_user
    background_tasks.add_task(generate_content_for_user, current_user.id)
    return {"message": "Generación iniciada en segundo plano."}


@router.post("/generate-url", status_code=202)
async def generate_from_url(
    payload: GenerateFromURLRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_active_user),
):
    """Generate LinkedIn post from a specific URL."""
    from services.content_pipeline import generate_content_for_user
    from services.scraper_service import scrape_article

    async def pipeline():
        article = await scrape_article(payload.url)
        await generate_content_for_user(
            current_user.id,
            manual_url=payload.url,
            article_data=article,
        )

    background_tasks.add_task(pipeline)
    return {"message": "Análisis de URL iniciado en segundo plano."}


@router.put("/{post_id}")
async def update_post(
    post_id: int,
    linkedin_post: Optional[str] = None,
    infographic_prompt: Optional[str] = None,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    """Allow user to edit generated content."""
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")

    if linkedin_post is not None:
        post.linkedin_post = linkedin_post
    if infographic_prompt is not None:
        post.infographic_prompt = infographic_prompt

    await db.commit()
    return {"message": "Post actualizado."}


@router.delete("/{post_id}", status_code=204)
async def delete_post(
    post_id: int,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Post).where(Post.id == post_id, Post.user_id == current_user.id)
    )
    post = result.scalar_one_or_none()
    if not post:
        raise HTTPException(status_code=404, detail="Post no encontrado")
    await db.delete(post)
    await db.commit()
