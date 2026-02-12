import ssl

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings

# asyncpg 0.30+ removed the 'sslmode' query param; strip it and pass ssl=True instead
_url = settings.DATABASE_URL
_connect_args: dict = {}
if "sslmode=" in _url:
    _url = _url.split("?")[0]  # drop all query params
    _ctx = ssl.create_default_context()
    _ctx.check_hostname = False
    _ctx.verify_mode = ssl.CERT_NONE
    _connect_args["ssl"] = _ctx

engine = create_async_engine(_url, echo=False, connect_args=_connect_args)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


async def get_db() -> AsyncSession:  # type: ignore[misc]
    async with async_session() as session:
        yield session
