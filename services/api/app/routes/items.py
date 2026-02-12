import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models import Contribution, Item, Reservation, Wishlist, User
from app.schemas import ContributeRequest, ItemCreate, ItemUpdate, ReserveRequest
from app.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wishlists", tags=["items"])


async def _get_owner_item(
    wishlist_id: uuid.UUID, item_id: uuid.UUID, user: User, db: AsyncSession,
    *, lock: bool = False,
) -> Item:
    stmt = (
        select(Item)
        .join(Wishlist)
        .where(
            Item.id == item_id,
            Item.wishlist_id == wishlist_id,
            Wishlist.owner_user_id == user.id,
        )
        .options(selectinload(Item.reservations), selectinload(Item.contributions))
    )
    if lock:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


async def _get_public_item(
    access_token: str, item_id: uuid.UUID, db: AsyncSession,
    *, lock: bool = False,
) -> Item:
    stmt = (
        select(Item)
        .join(Wishlist)
        .where(
            Item.id == item_id,
            Wishlist.access_token == access_token,
            Wishlist.is_public == True,
        )
        .options(selectinload(Item.reservations), selectinload(Item.contributions))
    )
    if lock:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def _item_dict(item: Item, is_owner: bool) -> dict:
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


async def _broadcast(wishlist_id: uuid.UUID, event: str, item: Item) -> None:
    """Helper to broadcast and log WS events."""
    data = _item_dict(item, is_owner=False)
    logger.info("WS broadcast: event=%s wishlist=%s item=%s", event, wishlist_id, item.id)
    await manager.broadcast(wishlist_id, event, str(item.id), data)


# ── Owner endpoints ──────────────────────────────────

@router.post("/{wishlist_id}/items", status_code=201)
async def create_item(
    wishlist_id: uuid.UUID,
    body: ItemCreate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Wishlist).where(Wishlist.id == wishlist_id, Wishlist.owner_user_id == user.id)
    )
    wl = result.scalar_one_or_none()
    if not wl:
        raise HTTPException(status_code=404, detail="Wishlist not found")

    item = Item(
        wishlist_id=wishlist_id,
        title=body.title,
        url=body.url,
        price_cents=body.price_cents,
        currency=body.currency,
        image_url=body.image_url,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    await _broadcast(wishlist_id, "item_created", item)
    return _item_dict(item, is_owner=True)


@router.patch("/{wishlist_id}/items/{item_id}")
async def update_item(
    wishlist_id: uuid.UUID,
    item_id: uuid.UUID,
    body: ItemUpdate,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_owner_item(wishlist_id, item_id, user, db, lock=True)
    if body.title is not None:
        item.title = body.title
    if body.url is not None:
        item.url = body.url
    if body.price_cents is not None:
        item.price_cents = body.price_cents
    if body.currency is not None:
        item.currency = body.currency
    if body.image_url is not None:
        item.image_url = body.image_url
    await db.commit()
    await db.refresh(item)
    item = await _get_owner_item(wishlist_id, item_id, user, db)
    await _broadcast(wishlist_id, "item_updated", item)
    return _item_dict(item, is_owner=True)


@router.post("/{wishlist_id}/items/{item_id}/archive")
async def archive_item(
    wishlist_id: uuid.UUID,
    item_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_owner_item(wishlist_id, item_id, user, db, lock=True)
    item.status = "archived"
    await db.commit()
    await db.refresh(item)
    item = await _get_owner_item(wishlist_id, item_id, user, db)
    await _broadcast(wishlist_id, "item_updated", item)
    return _item_dict(item, is_owner=True)


@router.post("/{wishlist_id}/items/{item_id}/unarchive")
async def unarchive_item(
    wishlist_id: uuid.UUID,
    item_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_owner_item(wishlist_id, item_id, user, db, lock=True)
    if item.status != "archived":
        raise HTTPException(status_code=400, detail="Item is not archived")
    item.status = "active"
    await db.commit()
    await db.refresh(item)
    item = await _get_owner_item(wishlist_id, item_id, user, db)
    await _broadcast(wishlist_id, "item_updated", item)
    return _item_dict(item, is_owner=True)


# ── Public endpoints (by access_token) ───────────────

@router.post("/public/{access_token}/items/{item_id}/reserve")
async def reserve_item(
    access_token: str,
    item_id: uuid.UUID,
    body: ReserveRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Lock item row to prevent race conditions
    item = await _get_public_item(access_token, item_id, db, lock=True)
    wl_result = await db.execute(select(Wishlist).where(Wishlist.access_token == access_token))
    wl = wl_result.scalar_one()
    if user and wl.owner_user_id == user.id:
        raise HTTPException(status_code=403, detail="Owner cannot reserve own items")
    if item.reserved:
        raise HTTPException(status_code=400, detail="Item already reserved")

    # Reject reserve if fully funded
    if item.price_cents and item.price_cents > 0:
        total_contributed = sum(c.amount_cents for c in item.contributions)
        if total_contributed >= item.price_cents:
            raise HTTPException(status_code=400, detail="This item is already fully funded")

    reservation = Reservation(
        item_id=item.id,
        reserver_user_id=user.id if user else None,
        reserver_display_name=body.display_name,
    )
    item.reserved = True
    item.reserved_at = datetime.now(timezone.utc)
    db.add(reservation)
    await db.commit()
    # Reload relations after commit
    item = await _get_public_item(access_token, item_id, db)
    await _broadcast(wl.id, "item_reserved", item)
    return _item_dict(item, is_owner=False)


@router.post("/public/{access_token}/items/{item_id}/unreserve")
async def unreserve_item(
    access_token: str,
    item_id: uuid.UUID,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Lock item row
    item = await _get_public_item(access_token, item_id, db, lock=True)
    if not item.reserved:
        raise HTTPException(status_code=400, detail="Item is not reserved")

    for r in list(item.reservations):
        await db.delete(r)
    item.reserved = False
    item.reserved_at = None
    await db.commit()

    wl_result = await db.execute(select(Wishlist).where(Wishlist.access_token == access_token))
    wl = wl_result.scalar_one()
    item = await _get_public_item(access_token, item_id, db)
    await _broadcast(wl.id, "item_unreserved", item)
    return _item_dict(item, is_owner=False)


@router.post("/public/{access_token}/items/{item_id}/contribute")
async def contribute_item(
    access_token: str,
    item_id: uuid.UUID,
    body: ContributeRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Lock item row to prevent race conditions on contribution totals
    item = await _get_public_item(access_token, item_id, db, lock=True)
    wl_result = await db.execute(select(Wishlist).where(Wishlist.access_token == access_token))
    wl = wl_result.scalar_one()
    if user and wl.owner_user_id == user.id:
        raise HTTPException(status_code=403, detail="Owner cannot contribute to own items")

    # Enforce: cannot contribute to zero-price or null-price items
    if not item.price_cents or item.price_cents <= 0:
        raise HTTPException(status_code=400, detail="This item does not accept contributions")

    # Strict contribution validation — no silent adjustments
    total_contributed = sum(c.amount_cents for c in item.contributions)
    remaining = item.price_cents - total_contributed
    if remaining <= 0:
        raise HTTPException(status_code=400, detail="This item is already fully funded")

    if body.amount_cents > remaining:
        raise HTTPException(
            status_code=400,
            detail=f"Maximum allowed contribution is {remaining} cents (${remaining / 100:.2f})",
        )

    contribution = Contribution(
        item_id=item.id,
        contributor_user_id=user.id if user else None,
        contributor_display_name=body.display_name,
        amount_cents=body.amount_cents,
    )
    db.add(contribution)
    await db.commit()
    # Reload
    item = await _get_public_item(access_token, item_id, db)
    await _broadcast(wl.id, "contribution_added", item)
    return _item_dict(item, is_owner=False)
