from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.models import Base
from app.routes import auth, items, scrape, wishlists, ws


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup (for dev; use alembic in prod)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield


app = FastAPI(title="Wishlist API", version="0.1.0", lifespan=lifespan)

# CORS
origins = [o.strip() for o in settings.CORS_ORIGINS.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(wishlists.router)
app.include_router(items.router)
app.include_router(scrape.router)
app.include_router(ws.router)


@app.get("/api/health")
async def health():
    return {"status": "ok"}
