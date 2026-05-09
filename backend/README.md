# ProjectHub Backend (FastAPI)

FastAPI + Postgres backend — see [`../docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md`](../docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md) for the full design and [`../docs/fastapi-backend-stack.md`](../docs/fastapi-backend-stack.md) for the conventions this codebase follows.

## Quickstart

```bash
# 1. Make sure your local Postgres is running and a `projecthub` database exists
#    (create it via pgAdmin or `createdb -U postgres projecthub` once).
#    Also create `projecthub_test` for the test suite (one-time).

# 2. Install Python deps in a virtualenv (one-time)
python -m venv .venv
source .venv/Scripts/activate           # Windows; macOS/Linux: source .venv/bin/activate
pip install -e ".[dev]"

# 3. Configure (one-time)
cp .env.example .env.local
# Edit .env.local — set DB_PASSWORD to your local Postgres password,
# JWT_SECRET (32+ chars random), GEMINI_API_KEY (used in Phase 6).

# 4. Apply migrations
alembic upgrade head

# 5. Seed dev data (idempotent)
python -m scripts.seed

# 6. Run the API
uvicorn app.main:app --reload --port 8000
```

API at `http://localhost:8000`. OpenAPI docs at `http://localhost:8000/docs`.

## Tests

```bash
pytest                 # one-shot
pytest -v              # verbose
pytest tests/test_health.py -v   # single file
```

Tests connect to the local Postgres `projecthub` database. The `db_clean` fixture truncates tables between tests that mutate state.

## Migrations

```bash
alembic upgrade head                                  # apply pending migrations
alembic downgrade -1                                  # roll back one revision
alembic history                                       # show all revisions
alembic revision -m "add foo column to bar"           # create a new (empty) revision
```

Revisions live in `migrations/versions/NNNN_<slug>.py`. Each revision uses raw SQL via `op.execute("""...""")` — no SQLAlchemy ORM. Always write a real `downgrade()`.

## Production image

```bash
docker build -t projecthub-backend:dev .
docker run -p 8000:8000 --env-file .env.local projecthub-backend:dev
```

The image runs `alembic upgrade head` on startup and serves via `gunicorn -k uvicorn.workers.UvicornWorker`.

## Project layout

```
app/
├── main.py        # FastAPI() + lifespan + CORS + exception handlers + routers
├── config.py      # Settings(BaseSettings) — env vars
├── db.py          # ConnectionPool + get_conn() context manager
├── responses.py   # ok() / fail() — {status, message, data} envelope
├── exceptions.py  # AppError + global handlers
└── routers/
    └── health.py  # GET /healthz (with optional ?deep=1 DB ping)
```

Future phases add `auth.py`, `ai.py`, `prompts/`, `schemas/`, and the rest of `routers/` (users, projects, tasks, etc.).

## Stack

- **Python 3.12**
- **FastAPI** + **Pydantic v2** + **pydantic-settings**
- **psycopg v3** with **psycopg-pool** (raw SQL — no ORM)
- **Alembic** with raw-SQL revisions
- **pytest** + **httpx** for the test client
- **ruff** + **mypy** for lint and types

## Conventions

See [`../docs/fastapi-backend-stack.md`](../docs/fastapi-backend-stack.md). Highlights:
- All response bodies wrap data in `{status, message, data}`.
- All IDs are UUIDs (`uuid` type, validated automatically by FastAPI when typed `UUID`).
- snake_case for column names; `created_at`/`updated_at` audit columns by default.
- Roles: `ceo` and `team_member`. CEO-only writes via `require_roles("ceo")` (Phase 2). Team-member-scoped reads filter by FK and return **404 (not 403)** on mismatch.
- Atomic multi-write operations use a single connection + manual transaction.

## See also

- Monorepo overview: [`../README.md`](../README.md)
- Frontend: [`../frontend/README.md`](../frontend/README.md)
- Migration tracker: [`../docs/migration-mapping.md`](../docs/migration-mapping.md)
