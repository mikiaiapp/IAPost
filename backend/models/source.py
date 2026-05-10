"""
Source model - RSS feeds and news URLs
"""
from datetime import datetime, timezone
from sqlalchemy import String, Boolean, Integer, ForeignKey, DateTime, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from core.database import Base


class SourceCategory(str, enum.Enum):
    ECONOMICS = "economics"
    AI = "ai"
    EPHEMERIS = "ephemeris"
    GENERAL = "general"


class SourceType(str, enum.Enum):
    RSS = "rss"
    URL = "url"
    API = "api"


class Source(Base):
    __tablename__ = "sources"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    url: Mapped[str] = mapped_column(String(2048), nullable=False)
    source_type: Mapped[SourceType] = mapped_column(Enum(SourceType), default=SourceType.RSS)
    category: Mapped[SourceCategory] = mapped_column(Enum(SourceCategory), default=SourceCategory.ECONOMICS)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    last_tested: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    last_test_status: Mapped[str] = mapped_column(String(50), nullable=True)
    last_test_message: Mapped[str] = mapped_column(Text, nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user = relationship("User", back_populates="sources")


# Default sources to seed for new users
DEFAULT_SOURCES = [
    # Economics
    {"name": "El Economista", "url": "https://www.eleconomista.es/rss/rss.php", "category": "economics", "type": "rss"},
    {"name": "Expansión", "url": "https://e00-expansion.uecdn.es/rss/portada.xml", "category": "economics", "type": "rss"},
    {"name": "Cinco Días", "url": "https://cincodias.elpais.com/rss/cincodias_portada.xml", "category": "economics", "type": "rss"},
    {"name": "Reuters Business", "url": "https://feeds.reuters.com/reuters/businessNews", "category": "economics", "type": "rss"},
    # AI
    {"name": "MIT Technology Review AI", "url": "https://www.technologyreview.com/topic/artificial-intelligence/feed/", "category": "ai", "type": "rss"},
    {"name": "VentureBeat AI", "url": "https://venturebeat.com/category/ai/feed/", "category": "ai", "type": "rss"},
    {"name": "The Verge AI", "url": "https://www.theverge.com/rss/ai-artificial-intelligence/index.xml", "category": "ai", "type": "rss"},
]
