import secrets
import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models import Contribution, Item, Wishlist, User
from app.schemas import (
    ItemResponse,
    WishlistCreate,
    WishlistListResponse,
    WishlistResponse,
    WishlistUpdate,
)

router = APIRouter(prefix="/api/wishlists", tags=["wishlists"])


def _item_to_response(item: Item, is_owner: bool) -> dict:
    total_contributed = sum(c.amount_cents for c in item.contributions)
    reservations = []
    contributions = []
    if not is_owner:
        reservations = [
            {"id": str(r.id), "reserver_display_name": r.reserver_display_name, "created_at": r.created_at.isoformat()}
            for r in item.reservations
        ]
        contributions = [
            {
                "id": str(c.id),
                "contributor_display_name": c.contributor_display_name,
                "amount_cents": c.amount_cents,
                "created_at": c.created_at.isoformat(),
            }
            for c in item.contributions
        ]
    return {
        "id": str(item.id),
        "wishlist_id": str(item.wishlist_id),
        "title": item.title,
        "url": item.url,
        "price_cents": item.price_cents,
        "currency": item.currency,
        "image_url": item.image_url,
        "status": item.status.value if hasattr(item.status, "value") else item.status,
        "reserved": item.reserved,
        "reserved_at": item.reserved_at.isoformat() if item.reserved_at else None,
        "created_at": item.created_at.isoformat(),
        "total_contributed": total_contributed,
        "reservations": reservations,
        "contributions": contributions,
    }


def _wishlist_to_response(wl: Wishlist, is_owner: bool) -> dict:
    return {
        "id": str(wl.id),
        "owner_user_id": str(wl.owner_user_id),
        "title": wl.title,
        "description": wl.description,
        "access_token": wl.access_token,
        "is_public": wl.is_public,
        "created_at": wl.created_at.isoformat(),
        "items": [_item_to_response(i, is_owner) for i in wl.items],
    }


@router.post("", status_code=201)
async def create_wishlist(
    body: WishlistCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    wl = Wishlist(
        owner_user_id=user.id,
        title=body.title,
        description=body.description,
        is_public=body.is_public,
        access_token=secrets.token_urlsafe(24),
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return _wishlist_to_response(wl, is_owner=True)


@router.get("")
async def list_wishlists(
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.owner_user_id == user.id)
        .options(selectinload(Wishlist.items))
        .order_by(Wishlist.created_at.desc())
    )
    wishlists = result.scalars().all()
    out = []
    for wl in wishlists:
        out.append({
            "id": str(wl.id),
            "title": wl.title,
            "description": wl.description,
            "access_token": wl.access_token,
            "is_public": wl.is_public,
            "created_at": wl.created_at.isoformat(),
            "item_count": len(wl.items),
        })
    return out


@router.get("/{wishlist_id}")
async def get_wishlist(
    wishlist_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.id == wishlist_id, Wishlist.owner_user_id == user.id)
        .options(
            selectinload(Wishlist.items).selectinload(Item.reservations),
            selectinload(Wishlist.items).selectinload(Item.contributions),
        )
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    return _wishlist_to_response(wl, is_owner=True)


@router.patch("/{wishlist_id}")
async def update_wishlist(
    wishlist_id: uuid.UUID,
    body: WishlistUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_user_id == user.id)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    if body.title is not None:
        wl.title = body.title
    if body.description is not None:
        wl.description = body.description
    if body.is_public is not None:
        wl.is_public = body.is_public
    await db.commit()
    await db.refresh(wl)
    return _wishlist_to_response(wl, is_owner=True)


@router.get("/public/{access_token}")
async def public_get_wishlist(
    access_token: str,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Wishlist)
        .where(Wishlist.access_token == access_token, Wishlist.is_public == True)
        .options(
            selectinload(Wishlist.items).selectinload(Item.reservations),
            selectinload(Wishlist.items).selectinload(Item.contributions),
        )
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found or not public")
    is_owner = user is not None and wl.owner_user_id == user.id
    return _wishlist_to_response(wl, is_owner=is_owner)
