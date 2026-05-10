"""Scraper router - manual URL analysis and source testing."""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from core.security import get_current_active_user
from models.user import User
from services.scraper_service import scrape_article

router = APIRouter()


class ScrapeURLRequest(BaseModel):
    url: str


@router.post("/analyze-url")
async def analyze_url(
    payload: ScrapeURLRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Scrape a URL and return extracted article data."""
    try:
        article = await scrape_article(payload.url)
        return article
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))
