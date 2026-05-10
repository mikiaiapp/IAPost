"""
Main content pipeline - orchestrates scraping + AI generation
Called by scheduler at 06:30 and on manual trigger
"""
import logging
from datetime import date, datetime, timezone
from sqlalchemy import select

from core.database import AsyncSessionLocal
from core.encryption import decrypt_api_key
from models.user import User
from models.post import Post, PostStatus, PostType
from models.ai_key import AIKey
from models.source import Source, SourceCategory
from services.scraper_service import fetch_rss_items
from services.ai_service import generate_text, select_best_model
from services.content_service import (
    SYSTEM_PROMPT,
    build_linkedin_post_prompt,
    build_infographic_prompt,
    generate_ephemeris,
)

logger = logging.getLogger(__name__)


async def run_daily_pipeline():
    """Run the daily content generation for all active users."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(User).where(User.is_active == True, User.is_verified == True)
        )
        users = result.scalars().all()

    for user in users:
        try:
            await generate_content_for_user(user.id)
        except Exception as e:
            logger.error(f"Pipeline failed for user {user.id}: {e}", exc_info=True)


async def generate_content_for_user(
    user_id: int,
    manual_url: str = None,
    article_data: dict = None,
) -> Post:
    """
    Generate a LinkedIn post for a user.
    - If manual_url/article_data provided: manual mode
    - Otherwise: auto mode using configured sources
    """
    async with AsyncSessionLocal() as db:
        # Get user
        user_result = await db.execute(select(User).where(User.id == user_id))
        user = user_result.scalar_one_or_none()
        if not user:
            raise ValueError(f"User {user_id} not found")

        # Get AI keys
        keys_result = await db.execute(
            select(AIKey).where(AIKey.user_id == user_id, AIKey.is_active == True)
        )
        ai_keys = keys_result.scalars().all()
        if not ai_keys:
            raise ValueError(f"No active AI keys for user {user_id}")

        # Select best provider
        ai_key_obj = ai_keys[0]
        provider = ai_key_obj.provider.value
        api_key = decrypt_api_key(ai_key_obj.encrypted_key)
        model = await select_best_model(provider, api_key, ai_key_obj.preferred_model)

        # Create post record
        post = Post(
            user_id=user_id,
            status=PostStatus.GENERATING,
            post_type=PostType.MANUAL if manual_url else PostType.AUTO,
            source_url=manual_url,
            ai_provider=provider,
            ai_model=model,
        )
        db.add(post)
        await db.flush()
        post_id = post.id

    try:
        today = date.today()

        if manual_url and article_data:
            # MANUAL MODE: generate from provided article
            linkedin_post, infographic_prompt = await _generate_from_article(
                article_data, provider, api_key, model
            )
            async with AsyncSessionLocal() as db:
                post = await db.get(Post, post_id)
                post.linkedin_post = linkedin_post
                post.infographic_prompt = infographic_prompt
                post.status = PostStatus.READY
                post.economic_news_title = article_data.get("title", "")
                post.economic_news_url = manual_url
                await db.commit()
                return post
        else:
            # AUTO MODE: scrape sources
            economic_news = await _fetch_best_economic_news(user_id)
            ai_news = await _fetch_best_ai_news(user_id)
            ephemeris = await generate_ephemeris(today, provider, api_key, model)

            # Generate LinkedIn post
            post_prompt = build_linkedin_post_prompt(economic_news, ai_news, ephemeris, today)
            linkedin_post = await generate_text(
                provider=provider,
                api_key=api_key,
                prompt=post_prompt,
                model=model,
                system_prompt=SYSTEM_PROMPT,
                max_tokens=2048,
                temperature=0.75,
            )

            # Generate infographic prompt
            infographic_prompt_text = build_infographic_prompt(economic_news, ai_news, ephemeris, today)
            infographic_prompt = await generate_text(
                provider=provider,
                api_key=api_key,
                prompt=infographic_prompt_text,
                model=model,
                system_prompt="Eres un director de arte especializado en infografías para redes sociales profesionales.",
                max_tokens=1024,
                temperature=0.8,
            )

            async with AsyncSessionLocal() as db:
                post = await db.get(Post, post_id)
                post.linkedin_post = linkedin_post
                post.infographic_prompt = infographic_prompt
                post.status = PostStatus.READY
                post.economic_news_title = economic_news.get("title", "")
                post.economic_news_content = economic_news.get("content", "")
                post.economic_news_url = economic_news.get("url", "")
                post.ai_news_title = ai_news.get("title", "")
                post.ai_news_content = ai_news.get("content", "")
                post.ephemeris = ephemeris
                await db.commit()
                return post

    except Exception as e:
        logger.error(f"Content generation failed for post {post_id}: {e}", exc_info=True)
        async with AsyncSessionLocal() as db:
            post = await db.get(Post, post_id)
            if post:
                post.status = PostStatus.FAILED
                post.error_message = str(e)[:500]
                await db.commit()
        raise


async def _fetch_best_economic_news(user_id: int) -> dict:
    """Fetch top economic news from user's configured sources."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Source).where(
                Source.user_id == user_id,
                Source.is_active == True,
                Source.category == SourceCategory.ECONOMICS,
            )
        )
        sources = result.scalars().all()

    if not sources:
        return {"title": "Sin fuentes económicas configuradas", "content": "", "url": ""}

    for source in sources:
        items = await fetch_rss_items(source.url, limit=3)
        if items:
            best = items[0]
            return {
                "title": best["title"],
                "content": best["summary"],
                "url": best["url"],
                "source": best["source"],
            }

    return {"title": "No se encontraron noticias económicas", "content": "", "url": ""}


async def _fetch_best_ai_news(user_id: int) -> dict:
    """Fetch top AI news from user's configured sources."""
    async with AsyncSessionLocal() as db:
        result = await db.execute(
            select(Source).where(
                Source.user_id == user_id,
                Source.is_active == True,
                Source.category == SourceCategory.AI,
            )
        )
        sources = result.scalars().all()

    if not sources:
        return {"title": "Sin fuentes de IA configuradas", "content": "", "url": ""}

    for source in sources:
        items = await fetch_rss_items(source.url, limit=3)
        if items:
            best = items[0]
            return {
                "title": best["title"],
                "content": best["summary"],
                "url": best["url"],
                "source": best["source"],
            }

    return {"title": "No se encontraron noticias de IA", "content": "", "url": ""}


async def _generate_from_article(article_data: dict, provider: str, api_key: str, model: str):
    """Generate post from a manually provided article."""
    from services.content_service import build_url_analysis_prompt

    prompt = build_url_analysis_prompt(article_data)
    result = await generate_text(
        provider=provider,
        api_key=api_key,
        prompt=prompt,
        model=model,
        system_prompt=SYSTEM_PROMPT,
        max_tokens=3000,
        temperature=0.75,
    )

    # Split on separator
    parts = result.split("---PROMPT_INFOGRAFIA---")
    linkedin_post = parts[0].strip()
    infographic_prompt = parts[1].strip() if len(parts) > 1 else "Infografía no generada."

    return linkedin_post, infographic_prompt
