import uuid
from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator


# ── Auth ──────────────────────────────────────────────
class RegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=6, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Wishlist ──────────────────────────────────────────
class WishlistCreate(BaseModel):
    title: str = Field(min_length=1, max_length=255)
    description: str = ""
    is_public: bool = True


class WishlistUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    is_public: bool | None = None


class WishlistResponse(BaseModel):
    id: uuid.UUID
    owner_user_id: uuid.UUID
    title: str
    description: str
    access_token: str
    is_public: bool
    created_at: datetime
    items: list["ItemResponse"] = []

    model_config = {"from_attributes": True}


class WishlistListResponse(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    access_token: str
    is_public: bool
    created_at: datetime
    item_count: int = 0

    model_config = {"from_attributes": True}


# ── Item ──────────────────────────────────────────────
class ItemCreate(BaseModel):
    title: str = Field(min_length=1, max_length=500)
    url: str | None = None
    price_cents: int | None = Field(default=None, ge=0, le=100_000_000)
    currency: str = Field(default="USD", min_length=1, max_length=3)
    image_url: str | None = None

    @field_validator("price_cents", mode="before")
    @classmethod
    def coerce_zero_price(cls, v: int | None) -> int | None:
        if v is not None and v < 0:
            raise ValueError("price_cents must be >= 0")
        return v


class ItemUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=500)
    url: str | None = None
    price_cents: int | None = Field(default=None, ge=0, le=100_000_000)
    currency: str | None = Field(default=None, min_length=1, max_length=3)
    image_url: str | None = None


class ContributionOut(BaseModel):
    id: uuid.UUID
    contributor_display_name: str
    amount_cents: int
    created_at: datetime

    model_config = {"from_attributes": True}


class ReservationOut(BaseModel):
    id: uuid.UUID
    reserver_display_name: str
    created_at: datetime

    model_config = {"from_attributes": True}


class ItemResponse(BaseModel):
    id: uuid.UUID
    wishlist_id: uuid.UUID
    title: str
    url: str | None
    price_cents: int | None
    currency: str
    image_url: str | None
    status: str
    reserved: bool
    reserved_at: datetime | None
    created_at: datetime
    total_contributed: int = 0
    reservations: list[ReservationOut] = []
    contributions: list[ContributionOut] = []

    model_config = {"from_attributes": True}


# ── Reserve / Contribute ──────────────────────────────
class ReserveRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)


class ContributeRequest(BaseModel):
    display_name: str = Field(min_length=1, max_length=100)
    amount_cents: int = Field(gt=0, le=100_000_000)


# ── Scrape ────────────────────────────────────────────
class ScrapeRequest(BaseModel):
    url: str


class ScrapeResponse(BaseModel):
    title: str | None = None
    image_url: str | None = None
    price_cents: int | None = None
    currency: str | None = None


# ── WebSocket events ─────────────────────────────────
class WSEvent(BaseModel):
    event: str
    item_id: str
    data: dict
