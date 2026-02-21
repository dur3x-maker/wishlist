import secrets
import uuid
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models import Contribution, Item, ItemStatus, Wishlist, User
from app.schemas import (
    ItemResponse,
    WishlistCreate,
    WishlistListResponse,
    WishlistResponse,
    WishlistUpdate,
)

router = APIRouter(prefix="/api/wishlists", tags=["wishlists"])


def _compute_status(item: Item, wl: Wishlist | None = None) -> str:
    from datetime import datetime, timezone
    if item.status == ItemStatus.archived:
        return ItemStatus.archived.value
    if item.price_cents and item.price_cents > 0:
        total = sum(c.amount_cents for c in item.contributions)
        if total >= item.price_cents:
            return ItemStatus.funded.value
    wishlist = wl or getattr(item, "wishlist", None)
    if wishlist and wishlist.deadline:
        deadline = wishlist.deadline if wishlist.deadline.tzinfo else wishlist.deadline.replace(tzinfo=timezone.utc)
        if deadline < datetime.now(timezone.utc) and item.status != ItemStatus.funded:
            return ItemStatus.expired.value
    return item.status.value if hasattr(item.status, "value") else item.status


def _item_to_response(item: Item, is_owner: bool, wl: Wishlist | None = None, current_user: User | None = None) -> dict:
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
    reserved_by_current_user = False
    if current_user and item.reservations:
        uid = str(current_user.id)
        for r in item.reservations:
            if r.reserver_user_id is not None and str(r.reserver_user_id) == uid:
                reserved_by_current_user = True
                break
    return {
        "id": str(item.id),
        "wishlist_id": str(item.wishlist_id),
        "title": item.title,
        "url": item.url,
        "price_cents": item.price_cents,
        "currency": item.currency,
        "image_url": item.image_url,
        "status": _compute_status(item, wl),
        "reserved": item.reserved,
        "is_reserved": item.reserved,
        "reserved_by_current_user": reserved_by_current_user,
        "reserved_at": item.reserved_at.isoformat() if item.reserved_at else None,
        "created_at": item.created_at.isoformat(),
        "total_contributed": total_contributed,
        "reservations": reservations,
        "contributions": contributions,
    }


def _wishlist_to_response(wl: Wishlist, is_owner: bool, current_user: User | None = None) -> dict:
    return {
        "id": str(wl.id),
        "owner_user_id": str(wl.owner_user_id),
        "title": wl.title,
        "description": wl.description,
        "access_token": wl.access_token,
        "is_public": wl.is_public,
        "deadline": wl.deadline.isoformat() if wl.deadline else None,
        "created_at": wl.created_at.isoformat(),
        "items": [_item_to_response(i, is_owner, wl, current_user) for i in wl.items],
    }


def _validate_deadline(deadline: datetime | None) -> None:
    if deadline is None:
        return
    now = datetime.now(timezone.utc)
    dl = deadline if deadline.tzinfo else deadline.replace(tzinfo=timezone.utc)
    if dl < now + timedelta(minutes=1):
        raise HTTPException(status_code=400, detail="Deadline must be at least 1 minute in the future")
    if dl > now + timedelta(days=365 * 3):
        raise HTTPException(status_code=400, detail="Deadline cannot be more than 3 years from now")


@router.post("", status_code=201)
async def create_wishlist(
    body: WishlistCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    _validate_deadline(body.deadline)
    wl = Wishlist(
        owner_user_id=user.id,
        title=body.title,
        description=body.description,
        is_public=body.is_public,
        deadline=body.deadline,
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
            "deadline": wl.deadline.isoformat() if wl.deadline else None,
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
    if body.deadline is not None:
        _validate_deadline(body.deadline)
        wl.deadline = body.deadline
    await db.commit()
    await db.refresh(wl)
    return _wishlist_to_response(wl, is_owner=True)


@router.delete("/{wishlist_id}", status_code=204)
async def delete_wishlist(
    wishlist_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_user_id == user.id)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")
    await db.delete(wl)
    await db.commit()
    return None


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
    return _wishlist_to_response(wl, is_owner=is_owner, current_user=user)
