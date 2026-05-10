"""
Auth router - register, login, verify, 2FA, password reset
"""
import secrets
from datetime import datetime, timedelta, timezone
from typing import Optional

import pyotp
import qrcode
import io
import base64

from fastapi import APIRouter, Depends, HTTPException, status, Request, Body
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from core.database import get_db
    get_password_hash, verify_password, create_access_token,
    get_current_active_user
)
import logging
logger = logging.getLogger(__name__)
from models.user import User
from models.source import Source, DEFAULT_SOURCES, SourceCategory, SourceType
from services.email_service import send_verification_email, send_password_reset_email

router = APIRouter()


# ─── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    requires_2fa: bool = False
    user_id: int
    username: str
    is_verified: bool


class VerifyTOTPRequest(BaseModel):
    user_id: int
    totp_code: str
    temp_token: str


class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class Enable2FAResponse(BaseModel):
    secret: str
    qr_code_base64: str
    manual_entry_key: str


class Confirm2FARequest(BaseModel):
    totp_code: str


# ─── Endpoints ────────────────────────────────────────────────────────────────

@router.post("/register", status_code=201)
async def register(
    request: Request,
    payload: RegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check duplicates
    result = await db.execute(select(User).where(User.email == payload.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email ya registrado")

    result = await db.execute(select(User).where(User.username == payload.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username ya en uso")

    # Create user
    token = secrets.token_urlsafe(32)
    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=get_password_hash(payload.password),
        full_name=payload.full_name,
        verification_token=token,
        is_verified=False,
    )
    db.add(user)
    await db.flush()

    # Seed default sources for new user
    for src in DEFAULT_SOURCES:
        source = Source(
            user_id=user.id,
            name=src["name"],
            url=src["url"],
            category=SourceCategory(src["category"]),
            source_type=SourceType(src["type"]),
        )
        db.add(source)

    await db.commit()
    logger.info(f"User {payload.username} registered and seeded with default sources.")

    # Send verification email
    try:
        base_url = str(request.base_url).rstrip("/")
        if ":8008" in base_url:
            base_url = base_url.replace(":8008", ":3333")
        elif ":8000" in base_url:
            base_url = base_url.replace(":8000", ":3333")
        
        await send_verification_email(payload.email, payload.username, token, base_url)
        return {"message": "Usuario creado. Revisa tu email para verificar la cuenta."}
    except Exception as e:
        logger.error(f"Failed to send verification email to {payload.email}: {e}")
        return {
            "message": "Usuario creado, pero hubo un problema al enviar el email de verificación. Por favor, contacta con soporte.",
            "error_info": "email_service_error"
        }


@router.post("/login", response_model=LoginResponse)
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db),
):
    # Authenticate
    result = await db.execute(select(User).where(User.email == form_data.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email o contraseña incorrectos",
        )

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Cuenta desactivada")

    # If 2FA enabled, return partial token requiring TOTP
    if user.totp_enabled:
        temp_token = create_access_token(
            {"sub": str(user.id), "type": "2fa_pending"},
            expires_delta=timedelta(minutes=5),
        )
        return LoginResponse(
            access_token=temp_token,
            requires_2fa=True,
            user_id=user.id,
            username=user.username,
            is_verified=user.is_verified,
        )

    access_token = create_access_token({"sub": str(user.id)})
    return LoginResponse(
        access_token=access_token,
        user_id=user.id,
        username=user.username,
        is_verified=user.is_verified,
    )


@router.post("/verify-2fa", response_model=LoginResponse)
async def verify_2fa(
    payload: VerifyTOTPRequest,
    db: AsyncSession = Depends(get_db),
):
    from jose import jwt, JWTError
    from core.config import settings

    try:
        decoded = jwt.decode(payload.temp_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if decoded.get("type") != "2fa_pending":
            raise HTTPException(status_code=400, detail="Token inválido")
        user_id = int(decoded["sub"])
    except JWTError:
        raise HTTPException(status_code=400, detail="Token expirado o inválido")

    user = await db.get(User, user_id)
    if not user or not user.totp_secret:
        raise HTTPException(status_code=400, detail="Usuario no encontrado")

    totp = pyotp.TOTP(user.totp_secret)
    if not totp.verify(payload.totp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Código 2FA incorrecto")

    access_token = create_access_token({"sub": str(user.id)})
    return LoginResponse(
        access_token=access_token,
        user_id=user.id,
        username=user.username,
        is_verified=user.is_verified,
    )


@router.get("/verify-email")
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.verification_token == token))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=400, detail="Token inválido o expirado")
    user.is_verified = True
    user.verification_token = None
    await db.commit()
    return {"message": "Cuenta verificada correctamente. Ya puedes iniciar sesión."}


@router.post("/forgot-password")
async def forgot_password(
    request: Request,
    payload: ForgotPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.email == payload.email))
    user = result.scalar_one_or_none()
    if user:
        token = secrets.token_urlsafe(32)
        user.reset_token = token
        user.reset_token_expires = datetime.now(timezone.utc) + timedelta(hours=1)
        await db.commit()
        base_url = str(request.base_url).rstrip("/").replace("8000", "3000")
        await send_password_reset_email(payload.email, user.username, token, base_url)
    # Always return 200 to avoid user enumeration
    return {"message": "Si el email existe, recibirás un enlace de recuperación."}


@router.post("/reset-password")
async def reset_password(
    payload: ResetPasswordRequest,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(User).where(User.reset_token == payload.token))
    user = result.scalar_one_or_none()
    if not user or not user.reset_token_expires:
        raise HTTPException(status_code=400, detail="Token inválido")
    if user.reset_token_expires < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Token expirado")

    user.hashed_password = get_password_hash(payload.new_password)
    user.reset_token = None
    user.reset_token_expires = None
    await db.commit()
    return {"message": "Contraseña actualizada correctamente."}


@router.get("/2fa/setup", response_model=Enable2FAResponse)
async def setup_2fa(current_user: User = Depends(get_current_active_user)):
    secret = pyotp.random_base32()
    totp = pyotp.TOTP(secret)
    provisioning_url = totp.provisioning_uri(
        name=current_user.email, issuer_name="IAPost"
    )
    # Generate QR code
    qr = qrcode.QRCode(version=1, box_size=8, border=4)
    qr.add_data(provisioning_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    qr_b64 = base64.b64encode(buffer.getvalue()).decode()

    return Enable2FAResponse(
        secret=secret,
        qr_code_base64=qr_b64,
        manual_entry_key=secret,
    )


@router.post("/2fa/confirm")
async def confirm_2fa(
    payload: Confirm2FARequest,
    secret: str = Body(...),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    totp = pyotp.TOTP(secret)
    if not totp.verify(payload.totp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Código 2FA incorrecto")

    current_user.totp_secret = secret
    current_user.totp_enabled = True
    await db.commit()
    return {"message": "2FA activado correctamente."}


@router.post("/2fa/disable")
async def disable_2fa(
    payload: Confirm2FARequest,
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db),
):
    if not current_user.totp_secret:
        raise HTTPException(status_code=400, detail="2FA no estaba activado")
    totp = pyotp.TOTP(current_user.totp_secret)
    if not totp.verify(payload.totp_code, valid_window=1):
        raise HTTPException(status_code=400, detail="Código 2FA incorrecto")
    current_user.totp_secret = None
    current_user.totp_enabled = False
    await db.commit()
    return {"message": "2FA desactivado."}
