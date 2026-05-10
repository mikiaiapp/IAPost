"""
Web scraping engine - RSS feeds and URL content extraction
"""
import logging
import re
from datetime import datetime, timezone
from typing import Optional
from urllib.parse import urlparse

import feedparser
import httpx
from bs4 import BeautifulSoup

logger = logging.getLogger(__name__)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (compatible; IAPost/1.0; +https://iapost.app)",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "es-ES,es;q=0.9,en;q=0.8",
}


async def fetch_rss_items(url: str, limit: int = 5) -> list[dict]:
    """Fetch and parse RSS/Atom feed, return top N items."""
    try:
        async with httpx.AsyncClient(timeout=20.0, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            content = response.text

        feed = feedparser.parse(content)
        if feed.bozo and not feed.entries:
            raise ValueError(f"Invalid feed: {feed.bozo_exception}")

        items = []
        for entry in feed.entries[:limit]:
            items.append({
                "title": entry.get("title", ""),
                "url": entry.get("link", ""),
                "summary": _clean_html(entry.get("summary", entry.get("description", ""))),
                "published": _parse_date(entry),
                "source": feed.feed.get("title", urlparse(url).netloc),
            })
        return items
    except Exception as e:
        logger.error(f"RSS fetch failed for {url}: {e}")
        return []


async def scrape_article(url: str) -> dict:
    """
    Scrape a news article URL and extract main content.
    Returns dict with title, content, image_url, author, date.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0, headers=HEADERS, follow_redirects=True) as client:
            response = await client.get(url)
            response.raise_for_status()
            html = response.text

        soup = BeautifulSoup(html, "lxml")

        # Remove noise
        for tag in soup.find_all(["script", "style", "nav", "footer", "aside", "iframe", "noscript"]):
            tag.decompose()

        # Title
        title = (
            soup.find("h1") or
            soup.find("meta", property="og:title") or
            soup.find("title")
        )
        title_text = title.get_text(strip=True) if hasattr(title, "get_text") else (title.get("content", "") if title else "")

        # Open Graph description
        og_desc = soup.find("meta", property="og:description")
        description = og_desc.get("content", "") if og_desc else ""

        # Main content extraction (heuristic)
        content = _extract_main_content(soup)

        # Image
        og_image = soup.find("meta", property="og:image")
        image_url = og_image.get("content", "") if og_image else ""

        # Author
        author = _extract_author(soup)

        # Date
        date = _extract_date(soup)

        return {
            "title": title_text,
            "description": description,
            "content": content,
            "image_url": image_url,
            "author": author,
            "date": date,
            "url": url,
            "domain": urlparse(url).netloc,
        }
    except Exception as e:
        logger.error(f"Scraping failed for {url}: {e}")
        raise RuntimeError(f"No se pudo extraer el contenido de {url}: {str(e)}")


def _extract_main_content(soup: BeautifulSoup) -> str:
    """Heuristic: find main article body."""
    # Priority selectors for article content
    candidates = [
        soup.find("article"),
        soup.find(id=re.compile(r"article|content|main|story", re.I)),
        soup.find(class_=re.compile(r"article-body|entry-content|post-content|story-body|article__body", re.I)),
        soup.find("main"),
    ]
    for candidate in candidates:
        if candidate:
            paragraphs = candidate.find_all("p")
            text = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50)
            if len(text) > 200:
                return text[:5000]  # Limit content length

    # Fallback: all paragraphs
    paragraphs = soup.find_all("p")
    text = " ".join(p.get_text(strip=True) for p in paragraphs if len(p.get_text(strip=True)) > 50)
    return text[:5000]


def _extract_author(soup: BeautifulSoup) -> str:
    meta = soup.find("meta", attrs={"name": "author"}) or soup.find("meta", property="article:author")
    if meta:
        return meta.get("content", "")
    author_el = soup.find(class_=re.compile(r"author|byline", re.I))
    return author_el.get_text(strip=True)[:100] if author_el else ""


def _extract_date(soup: BeautifulSoup) -> Optional[str]:
    time_el = soup.find("time")
    if time_el:
        return time_el.get("datetime", time_el.get_text(strip=True))
    meta = soup.find("meta", property="article:published_time")
    return meta.get("content", "") if meta else None


def _clean_html(html_str: str) -> str:
    """Strip HTML tags from a string."""
    soup = BeautifulSoup(html_str, "lxml")
    return soup.get_text(separator=" ", strip=True)[:1000]


def _parse_date(entry) -> Optional[str]:
    try:
        if hasattr(entry, "published_parsed") and entry.published_parsed:
            from time import mktime
            return datetime.fromtimestamp(mktime(entry.published_parsed), tz=timezone.utc).isoformat()
    except Exception:
        pass
    return None


async def test_source(url: str, source_type: str) -> tuple[bool, str, list]:
    """Test if a source is accessible and returns articles."""
    try:
        if source_type == "rss":
            items = await fetch_rss_items(url, limit=3)
            if items:
                return True, f"✅ Feed válido. {len(items)} artículos encontrados.", items
            return False, "⚠️ Feed accesible pero sin artículos.", []
        else:
            article = await scrape_article(url)
            return True, f"✅ URL accesible: {article.get('title', 'Sin título')}", [article]
    except Exception as e:
        return False, f"❌ Error: {str(e)}", []
