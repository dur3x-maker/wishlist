import asyncio
import uuid
from datetime import datetime, timedelta, timezone

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.auth import create_access_token
from app.models import Base, User, Wishlist, Item, Reservation, Contribution, ItemStatus


# Use in-memory SQLite for tests
TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

engine = create_async_engine(TEST_DB_URL, echo=False)
TestSession = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


@pytest.fixture(scope="session")
def event_loop():
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


@pytest_asyncio.fixture(autouse=True)
async def setup_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


async def _override_get_db():
    async with TestSession() as session:
        yield session


@pytest_asyncio.fixture
async def client():
    from app.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = _override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def db_session():
    async with TestSession() as session:
        yield session


async def create_test_user(db: AsyncSession, email: str = "test@example.com", display_name: str = "Test User") -> User:
    user = User(
        id=uuid.uuid4(),
        email=email,
        password_hash="$2b$12$fakehashfakehashfakehashfakehashfakehashfakehashfake",
        display_name=display_name,
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


async def create_test_wishlist(
    db: AsyncSession, owner: User, title: str = "Test Wishlist", deadline: datetime | None = None,
) -> Wishlist:
    import secrets
    wl = Wishlist(
        id=uuid.uuid4(),
        owner_user_id=owner.id,
        title=title,
        access_token=secrets.token_urlsafe(24),
        deadline=deadline,
    )
    db.add(wl)
    await db.commit()
    await db.refresh(wl)
    return wl


async def create_test_item(
    db: AsyncSession, wishlist: Wishlist, title: str = "Test Item", price_cents: int | None = 10000,
) -> Item:
    item = Item(
        id=uuid.uuid4(),
        wishlist_id=wishlist.id,
        title=title,
        price_cents=price_cents,
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return item


def auth_header(user: User) -> dict:
    token = create_access_token(user.id)
    return {"Authorization": f"Bearer {token}"}
