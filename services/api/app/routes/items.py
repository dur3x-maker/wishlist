import logging
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.auth import get_current_user, require_user
from app.database import get_db
from app.models import Contribution, Item, ItemStatus, Reservation, Wishlist, User
from app.schemas import ContributeRequest, ItemCreate, ItemUpdate, ReserveRequest
from app.ws_manager import manager

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/wishlists", tags=["items"])


def _compute_item_status(item: Item, wishlist: Wishlist | None = None) -> str:
    """Compute effective status based on funding and deadline. Does NOT mutate the item."""
    if item.status == ItemStatus.archived:
        return ItemStatus.archived.value
    if item.price_cents and item.price_cents > 0:
        total = sum(c.amount_cents for c in item.contributions)
        if total >= item.price_cents:
            return ItemStatus.funded.value
    wl = wishlist or item.wishlist
    if wl and wl.deadline:
        deadline = wl.deadline if wl.deadline.tzinfo else wl.deadline.replace(tzinfo=timezone.utc)
        if deadline < datetime.now(timezone.utc) and item.status != ItemStatus.funded:
            return ItemStatus.expired.value
    return item.status.value if hasattr(item.status, "value") else item.status


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
        .options(
            selectinload(Item.reservations),
            selectinload(Item.contributions),
            selectinload(Item.wishlist),
        )
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
        .options(
            selectinload(Item.reservations),
            selectinload(Item.contributions),
            selectinload(Item.wishlist),
        )
    )
    if lock:
        stmt = stmt.with_for_update()
    result = await db.execute(stmt)
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    return item


def _item_dict(
    item: Item, is_owner: bool, current_user: User | None = None,
    *, _reserved_by_current_user: bool | None = None,
) -> dict:
    total_contributed = sum(c.amount_cents for c in item.contributions)
    effective_status = _compute_item_status(item)
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
    # Reservation flags
    is_reserved = item.reserved
    if _reserved_by_current_user is not None:
        reserved_by_current_user = _reserved_by_current_user
    else:
        reserved_by_current_user = False
        if current_user and item.reservations:
            uid = str(current_user.id)
            for r in item.reservations:
                rid = r.reserver_user_id
                if rid is not None and (rid == current_user.id or str(rid) == uid):
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
        "status": effective_status,
        "reserved": is_reserved,
        "is_reserved": is_reserved,
        "reserved_by_current_user": reserved_by_current_user,
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


@router.delete("/{wishlist_id}/items/{item_id}", status_code=204)
async def delete_item(
    wishlist_id: uuid.UUID,
    item_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_owner_item(wishlist_id, item_id, user, db)
    await db.delete(item)
    await db.commit()
    return None


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


@router.post("/{wishlist_id}/items/{item_id}/move/{new_wishlist_id}")
async def move_item(
    wishlist_id: uuid.UUID,
    item_id: uuid.UUID,
    new_wishlist_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_owner_item(wishlist_id, item_id, user, db, lock=True)
    # Verify new wishlist belongs to same owner
    result = await db.execute(
        select(Wishlist).where(Wishlist.id == new_wishlist_id, Wishlist.owner_user_id == user.id)
    )
    new_wl = result.scalar_one_or_none()
    if not new_wl:
        raise HTTPException(status_code=404, detail="Target wishlist not found")
    if new_wishlist_id == wishlist_id:
        raise HTTPException(status_code=400, detail="Item is already in this wishlist")

    item.wishlist_id = new_wishlist_id
    item.status = ItemStatus.active
    await db.commit()
    await db.refresh(item)
    item = await _get_owner_item(new_wishlist_id, item_id, user, db)
    await _broadcast(wishlist_id, "item_updated", item)
    await _broadcast(new_wishlist_id, "item_created", item)
    return _item_dict(item, is_owner=True)


# ── Public endpoints (by access_token) ───────────────

@router.post("/public/{access_token}/items/{item_id}/reserve")
async def reserve_item(
    access_token: str,
    item_id: uuid.UUID,
    body: ReserveRequest,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_public_item(access_token, item_id, db, lock=True)
    wl_result = await db.execute(select(Wishlist).where(Wishlist.access_token == access_token))
    wl = wl_result.scalar_one()

    # Owner cannot reserve own items
    if wl.owner_user_id == user.id:
        raise HTTPException(status_code=403, detail="Owner cannot reserve own items")

    # Check lifecycle
    effective = _compute_item_status(item, wl)
    if effective == ItemStatus.expired.value:
        raise HTTPException(status_code=400, detail="This item has expired")
    if effective == ItemStatus.funded.value:
        raise HTTPException(status_code=400, detail="This item is already fully funded")

    if item.reserved:
        raise HTTPException(status_code=400, detail="Item already reserved")

    reservation = Reservation(
        item_id=item.id,
        reserver_user_id=user.id,
        reserver_display_name=body.display_name,
    )
    item.reserved = True
    item.reserved_at = datetime.now(timezone.utc)
    db.add(reservation)
    await db.commit()
    item = await _get_public_item(access_token, item_id, db)
    await _broadcast(wl.id, "item_reserved", item)
    return _item_dict(item, is_owner=False, current_user=user, _reserved_by_current_user=True)


@router.post("/public/{access_token}/items/{item_id}/unreserve")
async def unreserve_item(
    access_token: str,
    item_id: uuid.UUID,
    user: User = Depends(require_user),
    db: AsyncSession = Depends(get_db),
):
    current_uid = str(user.id)
    item = await _get_public_item(access_token, item_id, db, lock=True)
    if not item.reserved:
        raise HTTPException(status_code=400, detail="Item is not reserved")

    # Only the user who reserved can unreserve
    user_reservation = None
    for r in item.reservations:
        if r.reserver_user_id is not None and str(r.reserver_user_id) == current_uid:
            user_reservation = r
            break
    if not user_reservation:
        raise HTTPException(status_code=403, detail="You did not reserve this item")

    await db.delete(user_reservation)
    # Check if any reservations remain (shouldn't with single-reserve, but safe)
    remaining_reservations = [r for r in item.reservations if r.id != user_reservation.id]
    if not remaining_reservations:
        item.reserved = False
        item.reserved_at = None
    await db.commit()

    wl_result = await db.execute(select(Wishlist).where(Wishlist.access_token == access_token))
    wl = wl_result.scalar_one()
    item = await _get_public_item(access_token, item_id, db)
    await _broadcast(wl.id, "item_unreserved", item)
    return _item_dict(item, is_owner=False, current_user=user, _reserved_by_current_user=False)


@router.post("/public/{access_token}/items/{item_id}/contribute")
async def contribute_item(
    access_token: str,
    item_id: uuid.UUID,
    body: ContributeRequest,
    user: User | None = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    item = await _get_public_item(access_token, item_id, db, lock=True)
    wl_result = await db.execute(select(Wishlist).where(Wishlist.access_token == access_token))
    wl = wl_result.scalar_one()
    if user and wl.owner_user_id == user.id:
        raise HTTPException(status_code=403, detail="Owner cannot contribute to own items")

    # Check lifecycle
    effective = _compute_item_status(item, wl)
    if effective == ItemStatus.expired.value:
        raise HTTPException(status_code=400, detail="This item has expired")

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
    item = await _get_public_item(access_token, item_id, db)
    await _broadcast(wl.id, "contribution_added", item)
    return _item_dict(item, is_owner=False, current_user=user)
