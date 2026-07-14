# New Product — Backend Foundation

This document captures **why this backend is being reused**, **what to keep vs. adapt**, and the **integration contract** a new frontend must honor. It is the entry point for anyone building the new client product on the `backend-dev` branch.

## Background

The new product is a **similar-domain** application to ProjectHub (CEO-centric project management: role-based access, project → phase → task → submission → feedback → checkpoint lifecycle, leave/extension approval flows, and AI-assisted capture/review). Rather than start from scratch, we reuse ProjectHub's mature FastAPI + Postgres backend as a foundation and evolve it — improved architecture, additional features, and a different frontend.

- **Base commit:** `df4778d` (tip of the completed FastAPI migration — Phase 7, Prisma fully removed).
- **This branch (`backend-dev`) is backend-only.** The old Next.js frontend was removed; a new frontend will consume the API over HTTP.
- The original app and its full history remain on `master` and the `feature/*` branches.

## What to reuse as-is (product-agnostic core)

These are generic and should be built on, not rewritten:

| Area | File(s) | What it gives you |
|---|---|---|
| DB access | `backend/app/db.py` | psycopg3 `ConnectionPool` + `get_conn()` context manager (`dict_row`) |
| Config | `backend/app/config.py` | `Settings(BaseSettings)` — env validation, fail-fast, CORS list splitter |
| Responses | `backend/app/responses.py` | `ok()` / `fail()` → `{status, message, data}` envelope |
| Errors | `backend/app/exceptions.py` | `AppError` + 3 global handlers (domain / HTTP / catch-all 500, no detail leakage) |
| Auth | `backend/app/auth.py` | JWT (HS256) issue/decode, bcrypt hash/verify, `get_current_user`, `require_roles(...)` |
| AI plumbing | `backend/app/ai.py`, `backend/app/prompts/` | LiteLLM/Gemini wrapper (primary + fallback model, JSON-fence stripping, timing/logging) |
| App scaffold | `backend/app/main.py`, `backend/Dockerfile`, `backend/migrations/`, `backend/tests/` | App-factory + lifespan pool, raw-SQL Alembic migrations, Docker image, pytest layout |

## What is product-coupled (adapt for the new domain)

These encode ProjectHub's specific workflow — expect to change them for the new client:

- **Domain routers & schemas** — `backend/app/routers/{projects,phases,tasks,submissions,feedback,checkpoints,leaves,extensions,inbox,capture}.py` and the matching `backend/app/schemas/*`.
- **Role model** — the two-role `role_type IN ('ceo','team_member')` assumption is baked into `require_roles("ceo")` call sites and the "404-not-403" scoped-read convention.
- **Project taxonomy** — the `type IN ('engineering','research')` CHECK constraint plus the phase templates in `backend/app/projects_templates.py`.
- **Prompts & seed data** — `backend/app/prompts/*` and `backend/scripts/seed.py` are ProjectHub-specific.
- **Schema** — `backend/schema.sql` + `backend/migrations/versions/0001_initial.py` define the 13/14-table ProjectHub model; new entities/constraints go in new Alembic revisions.

See [`ARCHITECTURE_ROADMAP.md`](ARCHITECTURE_ROADMAP.md) for how to generalize these.

## Integration contract (what a new frontend must implement)

A new frontend in any stack talks to this backend over HTTP. It must honor:

- **Base URL:** `http://localhost:8000` in dev. Health probe is unprefixed: `GET /healthz`.
- **Route prefix:** all API routes are under `/api/v1/...`.
- **Response envelope:** every response is `{ "status": "success" | "failure", "message": string, "data": <payload> }`. Unwrap `.data` and check `.status`. Defined in `backend/app/responses.py`.
- **Casing:** request/response bodies are **snake_case** (`role_type`, `avatar_color`, `created_at`). The client adapts to/from its own casing.
- **Auth:** JWT Bearer. Send `Authorization: Bearer <access_token>` on authenticated calls.
  - `POST /api/v1/auth/login` — `{email, password}` → `{access_token, refresh_token, user}`
  - `GET /api/v1/auth/me` — current user
  - `POST /api/v1/auth/refresh` — `{refresh_token}` → `{access_token}`
  - `POST /api/v1/auth/logout` — stateless no-op (token/cookie disposal is a client concern)
  - Access token TTL 30 days, refresh 90 days, HS256. Refresh tokens are rejected for API auth.
- **Authorization:** CEO-only endpoints return **403**; team-scoped reads return **404 (not 403)** on ownership mismatch (avoids leaking existence).
- **CORS:** the new frontend's origin must be added to `ALLOWED_ORIGINS` (comma-separated) in the backend env. `allow_credentials=True`.

### Precise DTOs and full route list
- **Full route inventory:** [`migration-mapping.md`](migration-mapping.md) — every endpoint the backend exposes.
- **Request/response shapes:** `backend/app/schemas/*.py` (Pydantic models per domain) and `backend/app/shapes.py`.
- **Live OpenAPI:** run the backend and open `http://localhost:8000/docs`.

## Environment surface

From `backend/.env.example` (copy to `backend/.env.local`, gitignored):

| Var | Notes |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | Local Postgres connection |
| `JWT_SECRET` | **≥ 32 chars**, required |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins (add the new frontend's origin) |
| `GEMINI_API_KEY` | LiteLLM/Gemini AI features (optional until AI is used) |
| `WEB_CONCURRENCY` | gunicorn workers in the production Docker image |

## Dev credentials (seeded)

`backend/scripts/seed.py` seeds 1 CEO + 4 team members, all with dev password `projecthub-dev` (e.g. `ceo@projecthub.dev`). Full list in [`dev-seed-credentials.md`](dev-seed-credentials.md). Replace this seed data when the new product's domain is defined.
