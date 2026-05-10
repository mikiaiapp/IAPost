"""
Fernet encryption for API keys stored in DB
"""
import base64
import os
from cryptography.fernet import Fernet
from core.config import settings


def _get_fernet() -> Fernet:
    """Get or generate Fernet instance."""
    key = settings.ENCRYPTION_KEY
    if not key:
        # Fallback: generate from SECRET_KEY (not ideal for prod)
        import hashlib
        raw = hashlib.sha256(settings.SECRET_KEY.encode()).digest()
        key = base64.urlsafe_b64encode(raw).decode()
    # Ensure correct length
    if len(key) != 44:
        raw = hashlib.sha256(key.encode()).digest()
        key = base64.urlsafe_b64encode(raw).decode()
    return Fernet(key.encode())


def encrypt_api_key(plain_text: str) -> str:
    """Encrypt an API key for storage."""
    f = _get_fernet()
    return f.encrypt(plain_text.encode()).decode()


def decrypt_api_key(encrypted: str) -> str:
    """Decrypt a stored API key."""
    f = _get_fernet()
    return f.decrypt(encrypted.encode()).decode()
