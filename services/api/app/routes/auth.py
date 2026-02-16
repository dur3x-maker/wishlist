import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.auth import create_access_token, hash_password, require_user, verify_password
from app.config import settings
from app.database import get_db
from app.models import User
from app.schemas import LoginRequest, RegisterRequest, TokenResponse, UserResponse

router = APIRouter(prefix="/api/auth", tags=["auth"])

GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"


class GoogleAuthRequest(BaseModel):
    code: str
    redirect_uri: str


@router.post("/register", response_model=TokenResponse, status_code=201)
async def register(body: RegisterRequest, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(select(User).where(User.email == body.email))
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        email=body.email,
        password_hash=hash_password(body.password),
        display_name=body.display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/login", response_model=TokenResponse)
async def login(body: LoginRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == body.email))
    user = result.scalar_one_or_none()
    if not user or not user.password_hash or not verify_password(body.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return TokenResponse(access_token=create_access_token(user.id))


@router.post("/google", response_model=TokenResponse)
async def google_auth(body: GoogleAuthRequest, db: AsyncSession = Depends(get_db)):
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=501, detail="Google OAuth not configured")

    # Exchange authorization code for access token
    async with httpx.AsyncClient() as client:
        token_resp = await client.post(GOOGLE_TOKEN_URL, data={
            "code": body.code,
            "client_id": settings.GOOGLE_CLIENT_ID,
            "client_secret": settings.GOOGLE_CLIENT_SECRET,
            "redirect_uri": body.redirect_uri,
            "grant_type": "authorization_code",
        })
    if token_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to exchange Google auth code")
    token_data = token_resp.json()
    access_token = token_data.get("access_token")
    if not access_token:
        raise HTTPException(status_code=401, detail="No access token from Google")

    # Fetch user info from Google
    async with httpx.AsyncClient() as client:
        info_resp = await client.get(GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"})
    if info_resp.status_code != 200:
        raise HTTPException(status_code=401, detail="Failed to fetch Google user info")
    info = info_resp.json()
    google_id = info.get("id")
    email = info.get("email")
    name = info.get("name", "")
    if not google_id or not email:
        raise HTTPException(status_code=401, detail="Incomplete Google profile")

    # Find or create user
    result = await db.execute(
        select(User).where(User.oauth_provider == "google", User.oauth_id == google_id)
    )
    user = result.scalar_one_or_none()
    if not user:
        # Check if email already exists (registered via password)
        result = await db.execute(select(User).where(User.email == email))
        user = result.scalar_one_or_none()
        if user:
            # Link Google to existing account
            user.oauth_provider = "google"
            user.oauth_id = google_id
        else:
            user = User(
                email=email,
                display_name=name,
                oauth_provider="google",
                oauth_id=google_id,
            )
            db.add(user)
        await db.commit()
        await db.refresh(user)

    return TokenResponse(access_token=create_access_token(user.id))


@router.get("/me", response_model=UserResponse)
async def me(user: User = Depends(require_user)):
    return user
