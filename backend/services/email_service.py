"""
Cartero email service integration
"""
import logging
import httpx
from core.config import settings

logger = logging.getLogger(__name__)


async def send_email(
    to: str,
    subject: str,
    text: str,
    html: str = "",
    from_name: str = "IAPost",
) -> bool:
    """Send email via Cartero container API."""
    payload = {
        "to": to,
        "subject": subject,
        "text": text,
        "html": html or text,
        "key": settings.CARTERO_KEY,
        "fromName": from_name,
    }
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(settings.CARTERO_URL, json=payload)
            response.raise_for_status()
            logger.info(f"Email sent to {to}: {subject}")
            return True
    except httpx.HTTPError as e:
        logger.error(f"Cartero email failed for {to}: {e}")
        return False


async def send_verification_email(to: str, username: str, token: str, base_url: str) -> bool:
    verify_url = f"{base_url}/verify-email?token={token}"
    return await send_email(
        to=to,
        subject="✅ Verifica tu cuenta en IAPost",
        text=f"Hola {username},\n\nVerifica tu cuenta: {verify_url}\n\nSi no creaste esta cuenta, ignora este mensaje.",
        html=f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1e40af">IAPost - Verificación de cuenta</h2>
          <p>Hola <strong>{username}</strong>,</p>
          <p>Para activar tu cuenta haz clic en el botón:</p>
          <a href="{verify_url}" style="display:inline-block;background:#1e40af;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
            Verificar cuenta
          </a>
          <p style="color:#666;font-size:12px">Si no creaste una cuenta en IAPost, ignora este mensaje.</p>
        </div>
        """,
    )


async def send_password_reset_email(to: str, username: str, token: str, base_url: str) -> bool:
    reset_url = f"{base_url}/reset-password?token={token}"
    return await send_email(
        to=to,
        subject="🔑 Recuperación de contraseña - IAPost",
        text=f"Hola {username},\n\nRestablece tu contraseña: {reset_url}\n\nEl enlace expira en 1 hora.",
        html=f"""
        <div style="font-family:sans-serif;max-width:600px;margin:auto">
          <h2 style="color:#1e40af">IAPost - Recuperar contraseña</h2>
          <p>Hola <strong>{username}</strong>,</p>
          <p>Has solicitado restablecer tu contraseña:</p>
          <a href="{reset_url}" style="display:inline-block;background:#dc2626;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;margin:16px 0">
            Restablecer contraseña
          </a>
          <p style="color:#666;font-size:12px">Este enlace expira en 1 hora. Si no lo solicitaste, ignora este mensaje.</p>
        </div>
        """,
    )
