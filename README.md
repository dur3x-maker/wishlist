# Wishlist App

Social wishlist application. Create wishlists, share them via public links, and let friends reserve gifts or contribute money — while keeping the surprise for the owner.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: FastAPI + WebSocket (realtime)
- **Database**: PostgreSQL + SQLAlchemy 2.0 + Alembic
- **Auth**: Email/password with JWT

## Monorepo Structure

```
wishlist/
├── apps/web/          # Next.js frontend
├── services/api/      # FastAPI backend
├── infra/             # Docker Compose for local dev
└── README.md
```

## Quick Start (Docker)

```bash
cd infra
docker compose up --build
```

- **Frontend**: http://localhost:3000
- **API**: http://localhost:8000
- **API docs**: http://localhost:8000/docs

## Quick Start (Manual)

### 1. Start PostgreSQL

```bash
# Using Docker for just the database:
docker run -d --name wishlist-pg \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=wishlist \
  -p 5432:5432 \
  postgres:16-alpine
```

### 2. Start API

```bash
cd services/api
python -m venv .venv
# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 3. Start Frontend

```bash
cd apps/web
npm install
npm run dev
```

Open http://localhost:3000

## Features

- **Auth**: Register/login with email & password (JWT)
- **Wishlists**: Create, edit, share via public link
- **Items**: Add with title, URL, price, image
- **URL Autofill**: Paste a product URL → auto-extract title, image, price (OG tags + JSON-LD)
- **Reserve**: Friends can reserve a gift (prevents duplicates)
- **Contribute**: Friends can chip in money for expensive gifts
- **Owner privacy**: Owner never sees who reserved or contributed (surprise!)
- **Realtime**: WebSocket broadcasts reserve/contribute/update events instantly
- **Guest actions**: Reserve and contribute without an account (just enter your name)

## Deploy

### Frontend → Vercel

1. Import `apps/web` as a Next.js project on [Vercel](https://vercel.com)
2. Set environment variables:
   - `NEXT_PUBLIC_API_URL` = your API URL (e.g. `https://wishlist-api.onrender.com`)
   - `NEXT_PUBLIC_WS_URL` = your WS URL (e.g. `wss://wishlist-api.onrender.com`)

### Backend → Render

1. Create a new Web Service on [Render](https://render.com)
2. Root directory: `services/api`
3. Build command: `pip install -r requirements.txt`
4. Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
5. Set environment variables:
   - `DATABASE_URL` = your Postgres connection string (use `postgresql+asyncpg://...`)
   - `SECRET_KEY` = a strong random string
   - `CORS_ORIGINS` = your Vercel frontend URL

### Database → Neon / Supabase / Render Postgres

Use any managed PostgreSQL provider. Tables are auto-created on API startup.

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/register` | — | Register |
| POST | `/api/auth/login` | — | Login |
| GET | `/api/auth/me` | JWT | Current user |
| POST | `/api/wishlists` | JWT | Create wishlist |
| GET | `/api/wishlists` | JWT | List my wishlists |
| GET | `/api/wishlists/{id}` | JWT | Get wishlist (owner) |
| PATCH | `/api/wishlists/{id}` | JWT | Update wishlist |
| GET | `/api/wishlists/public/{token}` | — | Public wishlist |
| POST | `/api/wishlists/{id}/items` | JWT | Add item |
| PATCH | `/api/wishlists/{id}/items/{item_id}` | JWT | Update item |
| POST | `/api/wishlists/{id}/items/{item_id}/archive` | JWT | Archive item |
| POST | `/api/wishlists/public/{token}/items/{item_id}/reserve` | — | Reserve |
| POST | `/api/wishlists/public/{token}/items/{item_id}/unreserve` | — | Unreserve |
| POST | `/api/wishlists/public/{token}/items/{item_id}/contribute` | — | Contribute |
| POST | `/api/scrape` | — | Scrape URL metadata |
| WS | `/ws/wishlists/{id}` | — | Realtime events |
