"""
AI Key model - encrypted API keys per user per provider
"""
from datetime import datetime, timezone
from sqlalchemy import String, Integer, ForeignKey, DateTime, Boolean, Enum, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
import enum
from core.database import Base


class AIProvider(str, enum.Enum):
    GEMINI = "gemini"
    GROQ = "groq"
    OPENROUTER = "openrouter"


class AIKey(Base):
    __tablename__ = "ai_keys"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"), nullable=False)

    provider: Mapped[AIProvider] = mapped_column(Enum(AIProvider), nullable=False)
    encrypted_key: Mapped[str] = mapped_column(Text, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    # Preferred model (discovered dynamically)
    preferred_model: Mapped[str] = mapped_column(String(200), nullable=True)

    # Last validation
    last_validated: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    is_valid: Mapped[bool] = mapped_column(Boolean, nullable=True)
    validation_message: Mapped[str] = mapped_column(String(500), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user = relationship("User", back_populates="ai_keys")
