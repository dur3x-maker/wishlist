import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from sqlalchemy import text

from app.config import settings
from app.database import engine
from app.models import Base
from app.routes import auth, items, scrape, upload, wishlists, ws


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
app.include_router(upload.router)

# Serve uploaded images
_upload_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(_upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=_upload_dir), name="uploads")


@app.get("/api/health")
async def health():
    return {"status": "ok"}
