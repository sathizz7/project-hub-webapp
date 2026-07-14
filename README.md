# New Product Backend (FastAPI)

This repository is the **long-term backend foundation** for a new client product, built by reusing the proven FastAPI + Postgres backend from **ProjectHub** (a CEO-centric project-management tool). The new product lives in a **similar domain** but targets an **improved architecture, additional features, and a different frontend**.

The `backend-dev` branch is the active development branch for this work. The original ProjectHub app (including its Next.js frontend and full development history) remains on `master` and the `feature/*` branches.

## Repository layout

This branch is **backend-only** — the old Next.js frontend has been removed. A new frontend will be built separately and consume this API over HTTP.

| Directory | Purpose |
|---|---|
| [`backend/`](backend/) | FastAPI + Postgres backend — the reusable foundation |
| [`docs/`](docs/) | Design specs, the API/route contract, and the foundation + roadmap docs |

## Start here (for the new product)

- **[`docs/NEW_PRODUCT_FOUNDATION.md`](docs/NEW_PRODUCT_FOUNDATION.md)** — what to reuse as-is vs. adapt, and the **integration contract** a new frontend must honor (base URL, response envelope, auth, CORS, snake_case).
- **[`docs/ARCHITECTURE_ROADMAP.md`](docs/ARCHITECTURE_ROADMAP.md)** — the "improved architecture" generalization work to tackle once the new client's requirements are captured.

## Quickstart

```bash
cd backend
python -m venv .venv
source .venv/Scripts/activate     # Windows; macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"
cp .env.example .env.local        # set DB_PASSWORD, JWT_SECRET (32+ chars), GEMINI_API_KEY
alembic upgrade head              # requires a local Postgres `projecthub` database
python -m scripts.seed            # idempotent dev data
uvicorn app.main:app --reload --port 8000
```

API at `http://localhost:8000`, OpenAPI docs at `http://localhost:8000/docs`. Full details, tests, and the production Docker image are in [`backend/README.md`](backend/README.md).

## Architecture

Python 3.12 · FastAPI · Pydantic v2 · Postgres via psycopg v3 pool (**raw SQL, no ORM**) · Alembic (raw-SQL revisions) · JWT (HS256) + bcrypt auth · LiteLLM/Gemini for AI features. Every response uses the `{status, message, data}` envelope; all routes are prefixed `/api/v1`.

- **Backend design spec:** [`docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md`](docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md)
- **API / route contract** (what a new frontend codes against): [`docs/migration-mapping.md`](docs/migration-mapping.md)
- **FastAPI conventions:** [`docs/fastapi-backend-stack.md`](docs/fastapi-backend-stack.md)
