import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio

from app.auth import create_access_token
from app.models import Contribution, Item, ItemStatus, Reservation

from tests.conftest import (
    auth_header,
    create_test_item,
    create_test_user,
    create_test_wishlist,
)


# ── Wishlist CRUD ────────────────────────────────────


@pytest.mark.asyncio
async def test_create_wishlist(client, db_session):
    user = await create_test_user(db_session)
    resp = await client.post(
        "/api/wishlists",
        json={"title": "Birthday Gifts"},
        headers=auth_header(user),
    )
    assert resp.status_code == 201
    data = resp.json()
    assert data["title"] == "Birthday Gifts"
    assert data["is_public"] is True
    assert "access_token" in data


@pytest.mark.asyncio
async def test_create_wishlist_unauthorized(client):
    resp = await client.post("/api/wishlists", json={"title": "Nope"})
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_delete_wishlist(client, db_session):
    user = await create_test_user(db_session)
    wl = await create_test_wishlist(db_session, user)
    resp = await client.delete(
        f"/api/wishlists/{wl.id}",
        headers=auth_header(user),
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_wishlist_wrong_owner(client, db_session):
    user1 = await create_test_user(db_session, email="a@a.com")
    user2 = await create_test_user(db_session, email="b@b.com")
    wl = await create_test_wishlist(db_session, user1)
    resp = await client.delete(
        f"/api/wishlists/{wl.id}",
        headers=auth_header(user2),
    )
    assert resp.status_code == 404


# ── Item DELETE ──────────────────────────────────────


@pytest.mark.asyncio
async def test_delete_item(client, db_session):
    user = await create_test_user(db_session)
    wl = await create_test_wishlist(db_session, user)
    item = await create_test_item(db_session, wl)
    resp = await client.delete(
        f"/api/wishlists/{wl.id}/items/{item.id}",
        headers=auth_header(user),
    )
    assert resp.status_code == 204


@pytest.mark.asyncio
async def test_delete_item_wrong_owner(client, db_session):
    user1 = await create_test_user(db_session, email="owner@x.com")
    user2 = await create_test_user(db_session, email="other@x.com")
    wl = await create_test_wishlist(db_session, user1)
    item = await create_test_item(db_session, wl)
    resp = await client.delete(
        f"/api/wishlists/{wl.id}/items/{item.id}",
        headers=auth_header(user2),
    )
    assert resp.status_code == 404


# ── Reservation (authorized only) ───────────────────


@pytest.mark.asyncio
async def test_reserve_requires_auth(client, db_session):
    user = await create_test_user(db_session)
    wl = await create_test_wishlist(db_session, user)
    item = await create_test_item(db_session, wl)
    # No auth header → 401
    resp = await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/reserve",
        json={"display_name": "Guest"},
    )
    assert resp.status_code == 401


@pytest.mark.asyncio
async def test_reserve_and_unreserve(client, db_session):
    owner = await create_test_user(db_session, email="owner@r.com")
    reserver = await create_test_user(db_session, email="reserver@r.com")
    wl = await create_test_wishlist(db_session, owner)
    item = await create_test_item(db_session, wl)

    # Reserve
    resp = await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/reserve",
        json={"display_name": "Reserver"},
        headers=auth_header(reserver),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_reserved"] is True
    assert data["reserved_by_current_user"] is True

    # Unreserve
    resp = await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/unreserve",
        headers=auth_header(reserver),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["is_reserved"] is False


@pytest.mark.asyncio
async def test_unreserve_wrong_user_forbidden(client, db_session):
    owner = await create_test_user(db_session, email="own@u.com")
    user_a = await create_test_user(db_session, email="a@u.com")
    user_b = await create_test_user(db_session, email="b@u.com")
    wl = await create_test_wishlist(db_session, owner)
    item = await create_test_item(db_session, wl)

    # User A reserves
    await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/reserve",
        json={"display_name": "A"},
        headers=auth_header(user_a),
    )

    # User B tries to unreserve → 403
    resp = await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/unreserve",
        headers=auth_header(user_b),
    )
    assert resp.status_code == 403
    assert "did not reserve" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_is_reserved_flags(client, db_session):
    owner = await create_test_user(db_session, email="own@f.com")
    user_a = await create_test_user(db_session, email="a@f.com")
    user_b = await create_test_user(db_session, email="b@f.com")
    wl = await create_test_wishlist(db_session, owner)
    item = await create_test_item(db_session, wl)

    # User A reserves
    resp = await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/reserve",
        json={"display_name": "A"},
        headers=auth_header(user_a),
    )
    data = resp.json()
    assert data["is_reserved"] is True
    assert data["reserved_by_current_user"] is True


# ── Item Lifecycle (EXPIRED after deadline) ──────────


@pytest.mark.asyncio
async def test_item_expired_after_deadline(client, db_session):
    user = await create_test_user(db_session, email="dl@e.com")
    past = datetime.now(timezone.utc) - timedelta(days=1)
    wl = await create_test_wishlist(db_session, user, deadline=past)
    item = await create_test_item(db_session, wl, price_cents=10000)

    # Get wishlist — item should show as expired
    resp = await client.get(
        f"/api/wishlists/{wl.id}",
        headers=auth_header(user),
    )
    assert resp.status_code == 200
    items = resp.json()["items"]
    assert len(items) == 1
    assert items[0]["status"] == "expired"


@pytest.mark.asyncio
async def test_expired_item_cannot_be_reserved(client, db_session):
    owner = await create_test_user(db_session, email="own@exp.com")
    reserver = await create_test_user(db_session, email="res@exp.com")
    past = datetime.now(timezone.utc) - timedelta(days=1)
    wl = await create_test_wishlist(db_session, owner, deadline=past)
    item = await create_test_item(db_session, wl)

    resp = await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/reserve",
        json={"display_name": "Res"},
        headers=auth_header(reserver),
    )
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


@pytest.mark.asyncio
async def test_expired_item_cannot_be_contributed(client, db_session):
    owner = await create_test_user(db_session, email="own@expc.com")
    past = datetime.now(timezone.utc) - timedelta(days=1)
    wl = await create_test_wishlist(db_session, owner, deadline=past)
    item = await create_test_item(db_session, wl, price_cents=10000)

    resp = await client.post(
        f"/api/wishlists/public/{wl.access_token}/items/{item.id}/contribute",
        json={"display_name": "Donor", "amount_cents": 1000},
    )
    # Contribute allows guest (no auth required), but expired should block
    assert resp.status_code == 400
    assert "expired" in resp.json()["detail"].lower()


# ── Move Item ────────────────────────────────────────


@pytest.mark.asyncio
async def test_move_item_between_wishlists(client, db_session):
    user = await create_test_user(db_session, email="mv@m.com")
    wl1 = await create_test_wishlist(db_session, user, title="WL1")
    wl2 = await create_test_wishlist(db_session, user, title="WL2")
    item = await create_test_item(db_session, wl1)

    resp = await client.post(
        f"/api/wishlists/{wl1.id}/items/{item.id}/move/{wl2.id}",
        headers=auth_header(user),
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["wishlist_id"] == str(wl2.id)
    assert data["status"] == "active"


@pytest.mark.asyncio
async def test_move_item_wrong_owner(client, db_session):
    user1 = await create_test_user(db_session, email="u1@mv.com")
    user2 = await create_test_user(db_session, email="u2@mv.com")
    wl1 = await create_test_wishlist(db_session, user1)
    wl2 = await create_test_wishlist(db_session, user2)
    item = await create_test_item(db_session, wl1)

    # user2 tries to move user1's item
    resp = await client.post(
        f"/api/wishlists/{wl1.id}/items/{item.id}/move/{wl2.id}",
        headers=auth_header(user2),
    )
    assert resp.status_code == 404


@pytest.mark.asyncio
async def test_move_item_same_wishlist(client, db_session):
    user = await create_test_user(db_session, email="same@mv.com")
    wl = await create_test_wishlist(db_session, user)
    item = await create_test_item(db_session, wl)

    resp = await client.post(
        f"/api/wishlists/{wl.id}/items/{item.id}/move/{wl.id}",
        headers=auth_header(user),
    )
    assert resp.status_code == 400
