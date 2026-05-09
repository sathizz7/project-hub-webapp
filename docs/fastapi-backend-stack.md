---
name: fastapi-backend-stack
description: Use when setting up, bootstrapping, scaffolding, or extending a FastAPI + Postgres backend that follows IAS-Dashboard-style conventions (raw SQL, JWT, UUIDs, role names, response envelope, ownership rules) but on a containerized FastAPI stack instead of AWS Lambda + SAM. Trigger phrases: "set up the fastapi backend", "bootstrap a fastapi project", "scaffold a fastapi module/router/feature", "add a new domain to the fastapi backend", "wire up a new resource end-to-end in fastapi", or any request that spans schema + multiple routes + migrations + docs in a FastAPI project. Walks through schema → Pydantic models → router → DB layer → auth → migrations → OpenAPI docs. For the AWS Lambda variant of the same conventions, use `backend-stack-setup` instead.
---

# fastapi-backend-stack — FastAPI projects, IAS-style conventions

## Overview

Same engineering DNA as the IAS Dashboard backend (raw SQL, UUIDs, `{status, message, data}` envelope, JWT, role-based access, ownership rules, migrations-as-files), but the runtime is a single FastAPI process instead of one Lambda per endpoint. This skill is the FastAPI sibling of `backend-stack-setup`.

**Rule of thumb:** one domain = one `routers/<group>.py` file = one router. One HTTP endpoint = one route function. Raw SQL via psycopg, no ORM. No business logic in Pydantic models. No business logic in SQL files. Behavior lives in route functions and small db helpers.

---

## When to use

- Spinning up a new FastAPI project from scratch
- Adding a new domain area (router) to an existing FastAPI project that follows these conventions
- Cross-cutting feature: schema + multiple routes + migration + auth + docs

**Don't use for:** single-route additions to an established router (just write the route directly); pure bugfixes; doc-only changes; non-FastAPI Python projects (Flask, Django, etc.).

---

## Target project layout

```
project-root/
├── app/
│   ├── main.py                 # FastAPI() instance, include_router(...)
│   ├── config.py               # pydantic-settings: env vars, DB URL, JWT secret, CORS
│   ├── db.py                   # connection pool + execute_query, validate_uuid helpers
│   ├── auth.py                 # JWT decode + get_current_user dependency
│   ├── responses.py            # ok() / fail() helpers for the {status, message, data} envelope
│   ├── exceptions.py           # AppError + global exception handler
│   ├── schemas/                # Pydantic request/response models, one file per domain
│   │   ├── users.py
│   │   ├── entities.py
│   │   └── ...
│   └── routers/                # one file per domain group
│       ├── auth.py             # POST /api/v1/auth/login
│       ├── users.py
│       ├── entities.py
│       └── ...
├── migrations/
│   ├── env.py                  # Alembic config (or hand-rolled runner)
│   └── versions/               # NNN_<slug>.sql or .py — see Step 2
├── tests/
├── docker-compose.yml          # local Postgres
├── Dockerfile
├── pyproject.toml              # or requirements.txt
├── .env.example
├── schema.sql                  # source of truth (mirrored by migrations)
└── README.md
```

**Mapping back to the Lambda repo:** `src/<group>/<verb>/app.py` (Lambda) ↔ `app/routers/<group>.py::<verb>_<resource>()` (route function).

---

## Workflow

### Step 1 — Clarify until 95% confident

Ask **one consolidated** question covering:

- **Domain noun(s)** — what resources? (used for `routers/<group>.py` and table names)
- **Roles** — who can call each endpoint? (snake_case: `super_admin`, `admin`, `field_officer`, etc.)
- **Endpoints** — list method + path + purpose for each
- **Schema** — new tables? new columns? FKs? Confirm before touching `schema.sql`
- **Ownership rules** — which roles see only their own rows, and via which FK?
- **Atomicity** — any multi-write operations that must be transactional?
- **Migration tool** — Alembic (Python ops) or hand-rolled `.sql` runner? Default: Alembic + raw SQL inside revision files (best of both — versioned, reversible, no ORM coupling).
- **Local dev expectation** — `uvicorn --reload` + `docker compose up postgres` is the default; confirm.

Do not write code until resolved.

### Step 2 — Schema first

- **Never edit `schema.sql` without explicit user confirmation.** State the proposed DDL, get approval.
- After approval: update `schema.sql` AND create a migration:
  - **Alembic:** `alembic revision -m "<slug>"` then put raw SQL inside `op.execute("""...""")`. Always write a real `downgrade()`.
  - **Hand-rolled:** add `migrations/versions/NNN_<slug>.sql`, idempotent (`IF NOT EXISTS`, `DO $$ ... $$`).
- All PKs are **UUID** (`uuid` type, `gen_random_uuid()` default). Enable `pgcrypto` once in the very first migration.
- Audit columns by convention: `created_by uuid`, `created_at timestamptz default now()`, `updated_at timestamptz`.
- Per-parent sequential numbers → `MAX(seq)+1` inside the same transaction with `FOR UPDATE` on the parent row (mirror IAS `sites.site_number`).
- Reference codes (e.g. `26-GH-012-003`) — match the existing scheme if migrating from an IAS-style schema; don't invent a new one.

### Step 3 — Plan the endpoints

Confirmation table before scaffolding:

| Method | Path | Router function | Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/v1/<group>` | `routers/<group>.py::list_<group>` | admin, super_admin | … |
| POST | `/api/v1/<group>` | `routers/<group>.py::create_<resource>` | admin | … |
| GET | `/api/v1/<group>/{id}` | `routers/<group>.py::get_<resource>` | admin, super_admin | … |
| PATCH | `/api/v1/<group>/{id}` | `routers/<group>.py::update_<resource>` | admin | … |
| DELETE | `/api/v1/<group>/{id}` | `routers/<group>.py::delete_<resource>` | admin | … |
| GET | `/api/v1/my/<group>` | `routers/<group>.py::list_my_<group>` | field_officer | mobile / scoped |

Naming rules:
- Function names are `snake_case` verbs: `list_*`, `create_*`, `get_*`, `update_*`, `delete_*`, `submit_*`.
- "My"-style scoped endpoints live at `/api/v1/my/...` and filter by `current_user.user_id`.
- Parent-scoped admin endpoints use nested paths: `/api/v1/entities/{entity_id}/<group>`.

### Step 4 — Wire the router and route functions

Skeleton per route — keep it shaped like a Lambda handler so engineers from the IAS repo recognize it:

```python
# app/routers/<group>.py
from fastapi import APIRouter, Depends, HTTPException, status
from uuid import UUID
from app.auth import get_current_user, CurrentUser, require_roles
from app.db import get_conn, execute_query
from app.responses import ok
from app.schemas.<group> import <Resource>Create, <Resource>Out

router = APIRouter(prefix="/api/v1/<group>", tags=["<group>"])

@router.post("", dependencies=[Depends(require_roles("admin", "super_admin"))])
def create_<resource>(payload: <Resource>Create, user: CurrentUser = Depends(get_current_user)):
    with get_conn() as conn:                                # context-managed transaction
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO <table> (...) VALUES (...) RETURNING id, ...",
                (payload.field1, payload.field2, user.user_id),
            )
            row = cur.fetchone()
        conn.commit()
    return ok(data=<Resource>Out.model_validate(row).model_dump(), message="Created")

@router.get("/{id}")
def get_<resource>(id: UUID, user: CurrentUser = Depends(get_current_user)):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("SELECT ... FROM <table> WHERE id = %s", (str(id),))
        row = cur.fetchone()
    if not row:
        raise HTTPException(status_code=404, detail="Not found")
    return ok(data=row)
```

Hard rules (carried over from the IAS skill):

- **Raw SQL via psycopg (v3 preferred, v2 acceptable)** — no SQLAlchemy ORM, no query builder. Parameterize with `%s` always; never f-string SQL.
- **One connection pool**, opened in `app/db.py` (`psycopg_pool.ConnectionPool` or psycopg2 + a pool of your choice). Route functions check out / return per request.
- **Response envelope:** every successful response goes through `ok(...)` → `{"status": "success", "message": "...", "data": ...}`. Errors go through `fail(...)` or the global exception handler → `{"status": "failure", "message": "..."}` with the right HTTP status.
- **Pydantic models** define request shapes (`<Resource>Create`, `<Resource>Update`) and response shapes (`<Resource>Out`). Keep them in `app/schemas/<group>.py`. **No business logic in models** — validators only for shape/format.
- **Auth via dependency:** `get_current_user` decodes the JWT (HS256 with shared secret from env), returns a `CurrentUser` dataclass with `user_id: UUID`, `role: str`, plus any other claims. `require_roles("admin", ...)` is a small dependency factory that 403s on mismatch.
- **UUID validation** is automatic when the path/body is typed `UUID` — FastAPI returns 422 for malformed UUIDs. No manual `validate_uuid` needed.
- **Ownership scoping:** for field-officer/scoped endpoints, filter by `WHERE assigned_officer_id = %s` (or equivalent FK) and return **404, not 403**, when the resource isn't theirs (matches IAS pattern — don't leak existence).
- **Atomic multi-write operations:** open one connection, set `autocommit = False`, run all SQL, `commit()` at the end, `rollback()` on exception. Mirror the IAS `tasks/submit_task` pattern.
- **CORS** is set on the FastAPI app via `CORSMiddleware` from a comma-separated env var (`ALLOWED_ORIGINS`) — replaces `CorsUtility`.

### Step 5 — Wire it into `app/main.py`

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import settings
from app.routers import auth, users, entities, <group>

app = FastAPI(title="<Project> API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(entities.router)
app.include_router(<group>.router)
```

One `include_router` per domain. Don't put route functions in `main.py`.

### Step 6 — Docs are (mostly) free

FastAPI auto-generates OpenAPI from your route signatures + Pydantic models:

- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`
- OpenAPI JSON: `http://localhost:8000/openapi.json` — import into Postman/Insomnia for a collection.

Manual docs to maintain:

- `README.md` — quickstart (env vars, `docker compose up`, `alembic upgrade head`, `uvicorn app.main:app --reload`).
- `docs/<FEATURE>.md` for non-trivial flows (mirror IAS `FIELD_OFFICER_ISSUES_AND_RESPONSES.md` style).
- A "Recent Changes" section in the project's CLAUDE.md with numbered entries when adding domains.

### Step 7 — Local dev + deploy checklist

**Local dev (default loop):**

```bash
docker compose up -d postgres
alembic upgrade head        # or psql -f schema.sql for first run
cp .env.example .env        # set DB_URL, JWT_SECRET, ALLOWED_ORIGINS
uvicorn app.main:app --reload --port 8000
```

Frontend dev server hits `http://localhost:8000/api/v1/...`. CORS allowed-origin must include the frontend URL (e.g. `http://localhost:5173`).

**Deploy options (pick one when the user asks):**

- Docker image → ECS Fargate / Cloud Run / Fly.io / Render / Railway / a plain VM with `uvicorn` behind nginx
- Use `gunicorn -k uvicorn.workers.UvicornWorker -w <2*CPU+1>` in production, not `--reload`
- DB on managed Postgres (RDS, Cloud SQL, Neon, Supabase)
- Secrets via the platform's secret store, **not** committed `.env`

Pre-deploy checks:
- [ ] Migrations applied on target DB before container rolls out
- [ ] `JWT_SECRET`, `DB_URL`, `ALLOWED_ORIGINS` set in target environment
- [ ] `gunicorn` workers > 1 if you expect concurrency
- [ ] Health check route (`GET /healthz`) wired and configured in the platform

---

## Quick reference — must-match conventions

| Concern | Convention |
|---|---|
| Web framework | FastAPI (Pydantic v2) |
| DB driver | `psycopg` v3 (preferred) or `psycopg2` — never an ORM |
| Connection mgmt | Single pool in `app/db.py`, one connection per request |
| Response shape | `{"status", "message", "data"}` via `ok()` / `fail()` helpers |
| Auth | JWT (HS256) decoded by a `get_current_user` dependency; `require_roles(...)` for RBAC |
| Roles | snake_case (`super_admin`, `admin`, `field_officer`, …) |
| IDs | UUID strings end-to-end; FastAPI auto-validates `UUID`-typed path params |
| Ownership | Filter by FK to user; return 404 (not 403) when scope mismatches |
| "Mobile" / scoped paths | `/api/v1/my/...`, filter by `current_user.user_id` |
| Atomic writes | Single connection + manual transaction, mirror IAS `submit_task` |
| Schema | edit `schema.sql` only after explicit confirmation; pair with a migration |
| Migrations | Alembic with raw SQL in revisions (default), or hand-rolled `migrations/versions/NNN_*.sql` |
| Docs | OpenAPI auto-generated; supplement with `README.md` + `docs/<FEATURE>.md` |
| Local dev | `docker compose up postgres` + `uvicorn --reload` |

---

## Common mistakes

- ❌ Importing SQLAlchemy "just for the session" → conventions are raw-SQL; once the ORM lands the codebase drifts.
- ❌ Putting business logic in Pydantic validators → models are shapes, not behavior.
- ❌ f-string interpolation into SQL → SQL injection. Always parameterize with `%s` and a tuple.
- ❌ Using integer PKs anywhere → UUID end-to-end (matches IAS schema and avoids enumeration).
- ❌ Returning 403 instead of 404 on ownership mismatch → leaks resource existence.
- ❌ One huge `routers/api.py` with every endpoint → one router file per domain.
- ❌ Editing `schema.sql` without a paired migration → drifts dev DB from prod.
- ❌ Running `uvicorn --reload` in production → use `gunicorn` with `UvicornWorker`.
- ❌ Hard-coding `ALLOWED_ORIGINS=*` with `allow_credentials=True` → browsers reject it; list explicit origins.
- ❌ Holding DB connections across `await` boundaries in long-running async routes → exhausts the pool.

---

## Anchor patterns (mirror these)

When in doubt, structure new code like:

- **CRUD router** → mirror `routers/entities.py` (or whichever is established) — list / create / get / update / delete in one file.
- **Atomic multi-write** → see whichever route does a multi-table insert in one transaction (analogous to IAS `tasks/submit_task`).
- **Scoped/ownership read** → see the `/api/v1/my/...` routes; copy the filter + 404 pattern.
- **Auth flow** → `routers/auth.py` `login()` → bcrypt verify → issue JWT with `user_id`, `role`, `exp`.
- **Per-parent sequential numbers** → reuse the `SELECT ... FOR UPDATE` + `MAX(seq)+1` pattern from IAS `create_site`.

Read the closest analogue in the project **before** writing new code; copy the structure, not just the imports.
