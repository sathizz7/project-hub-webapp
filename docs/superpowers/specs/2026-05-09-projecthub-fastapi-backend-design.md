# ProjectHub FastAPI Backend — Design Spec

**Date:** 2026-05-09
**Status:** Approved (brainstorming complete)
**Author:** Shiva Gurunath
**Drives:** docs/superpowers/plans/2026-05-09-fastapi-backend-plan.md (to be written next)

---

## Goal

Replace the current Next.js + Prisma + SQLite full-stack setup with a clean separation: **Next.js as a pure frontend** + **FastAPI + Postgres as a standalone backend**, in a monorepo. The backend follows the conventions in `docs/fastapi-backend-stack.md` (raw SQL, UUIDs, JWT, `{status, message, data}` envelope, role-based access). Migration is incremental — feature by feature — so the app stays functional throughout.

## Non-goals

- Mobile app build (the API is designed to support one later, but no mobile work in this scope).
- Production AWS deployment (deferred to a later release; v1 runs on local Postgres + local dev).
- Multi-tenancy, billing, public signup, or any features outside today's product.
- Real-time features (websockets, SSE streaming) — synchronous request/response only in v1.
- Migrating existing `dev.db` data (greenfield reset; data is seed-only).

---

## Section 1 — Repo layout & dev workflow

### Monorepo structure

```
ProjectHub/                          # repo root (existing, just reorganized)
├── frontend/                        # current Next.js app moves here as-is
│   ├── src/
│   ├── public/
│   ├── package.json
│   ├── next.config.ts
│   ├── tailwindcss.config.ts
│   ├── tsconfig.json
│   ├── vitest.config.ts
│   ├── components.json
│   └── README.md
├── backend/                         # NEW
│   ├── app/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI() + include_router(...) + CORSMiddleware
│   │   ├── config.py                # pydantic-settings (DB_URL, JWT_SECRET, ALLOWED_ORIGINS, GEMINI_API_KEY)
│   │   ├── db.py                    # psycopg3 ConnectionPool + execute_query helper
│   │   ├── auth.py                  # JWT decode, get_current_user, require_roles
│   │   ├── responses.py             # ok() / fail() — {status, message, data}
│   │   ├── exceptions.py            # AppError + global handler
│   │   ├── ai.py                    # LiteLLM wrapper (Gemini Flash + Flash-Lite fallback)
│   │   ├── schemas/                 # Pydantic models, one file per domain
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── projects.py
│   │   │   ├── phases.py
│   │   │   ├── tasks.py
│   │   │   ├── submissions.py
│   │   │   ├── feedback.py
│   │   │   ├── checkpoints.py
│   │   │   ├── leaves.py
│   │   │   ├── extensions.py
│   │   │   ├── capture.py
│   │   │   ├── ai.py
│   │   │   └── inbox.py
│   │   ├── routers/                 # one file per domain
│   │   │   ├── __init__.py
│   │   │   ├── auth.py
│   │   │   ├── users.py
│   │   │   ├── projects.py
│   │   │   ├── phases.py
│   │   │   ├── tasks.py
│   │   │   ├── submissions.py
│   │   │   ├── feedback.py
│   │   │   ├── checkpoints.py
│   │   │   ├── leaves.py
│   │   │   ├── extensions.py
│   │   │   ├── capture.py
│   │   │   ├── ai.py
│   │   │   ├── inbox.py
│   │   │   └── health.py
│   │   └── prompts/                 # LLM system prompts as Python modules
│   │       ├── __init__.py
│   │       ├── capture.py
│   │       ├── generate_plan.py
│   │       ├── review.py
│   │       └── suggest_stack.py
│   ├── migrations/
│   │   ├── env.py                   # Alembic config
│   │   └── versions/                # NNN_<slug>.py revisions with raw SQL
│   ├── scripts/
│   │   └── seed.py                  # idempotent seed: 1 ceo + N team members + 2-3 projects
│   ├── tests/
│   │   ├── conftest.py              # pytest fixtures (test DB, JWT, client)
│   │   ├── test_auth.py
│   │   ├── test_users.py
│   │   ├── test_projects.py
│   │   └── ... (one per router)
│   ├── docker-compose.yml           # local Postgres 16
│   ├── Dockerfile                   # gunicorn -k uvicorn.workers.UvicornWorker (prod)
│   ├── pyproject.toml               # FastAPI, psycopg[pool], pydantic-settings, PyJWT, bcrypt, litellm, alembic, pytest, ruff, mypy
│   ├── alembic.ini
│   ├── schema.sql                   # source-of-truth DDL (mirrored by migrations)
│   ├── .env.example
│   └── README.md
├── docs/                            # shared (specs, plans, skills)
│   ├── fastapi-backend-stack.md
│   ├── skill.md                     # AWS Lambda variant (kept for reference)
│   ├── migration-mapping.md         # NEW — living table of route migration status
│   └── superpowers/
│       ├── specs/
│       └── plans/
├── .gitignore
└── README.md                        # monorepo overview
```

### Local dev workflow

```bash
# Terminal 1 — backend
cd backend
docker compose up -d postgres                 # local Postgres 16 on :5432
alembic upgrade head                          # apply migrations
python scripts/seed.py                        # populate seed data
uvicorn app.main:app --reload --port 8000     # API at http://localhost:8000
# OpenAPI docs at http://localhost:8000/docs

# Terminal 2 — frontend
cd frontend
npm run dev                                   # Next.js at http://localhost:3000
```

Frontend env (`frontend/.env.local`):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

Frontend does **not** need `JWT_SECRET`. FastAPI signs/verifies tokens; the frontend only stores the cookie value verbatim and forwards it as a Bearer header. If someone tampers with the cookie, FastAPI will reject the resulting token's signature.

Backend env (`backend/.env.local`):
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=projecthub
DB_USER=postgres
DB_PASSWORD=<your-postgres-password>
JWT_SECRET=<32-char-random-string>
ALLOWED_ORIGINS=http://localhost:3000
GEMINI_API_KEY=<your-gemini-api-key>
```

`.env.example` files committed in both apps with placeholder values; real `.env.local` gitignored.

---

## Section 2 — Module breakdown (router files)

### Roles

Two roles, snake_case (matches today's `roleType`):
- `ceo` — full read/write across all resources.
- `team_member` — reads scoped to own assignments; writes only to own resources (own leave requests, own submissions, etc.).

Authorization uses two patterns from the skill:
- **`require_roles("ceo")`** dependency for CEO-only writes (returns 403 on mismatch).
- **Ownership filtering in SQL** (`WHERE assignee_id = %s` etc.) for team-member-scoped reads, returning **404 (not 403)** when the resource isn't theirs (per skill rule — don't leak existence).

### The 14 routers

| Router | Endpoints | Roles |
|---|---|---|
| **`auth.py`** | `POST /api/v1/auth/login`<br>`POST /api/v1/auth/refresh`<br>`POST /api/v1/auth/logout`<br>`GET  /api/v1/auth/me` | public (login, refresh) / authenticated (me, logout) |
| **`users.py`** | `GET    /api/v1/users`<br>`GET    /api/v1/users/{id}`<br>`POST   /api/v1/users` *(ceo)*<br>`PATCH  /api/v1/users/{id}` *(ceo)* | ceo + team_member (reads); ceo (writes) |
| **`projects.py`** | `GET    /api/v1/projects` *(hydrated: assignees + progress)*<br>`POST   /api/v1/projects` *(ceo)*<br>`GET    /api/v1/projects/{id}` *(hydrated: phases + assignees + submissions + tasks + checkpoints)*<br>`PATCH  /api/v1/projects/{id}`<br>`POST   /api/v1/projects/{id}/assignees`<br>`DELETE /api/v1/projects/{id}/assignees/{user_id}`<br>`GET    /api/v1/my/projects` | ceo (writes); team_member (own assigned only) |
| **`phases.py`** | `GET    /api/v1/projects/{id}/phases`<br>`PATCH  /api/v1/phases/{id}` | ceo, assigned team_member |
| **`tasks.py`** | `GET    /api/v1/tasks` *(filter: project_id, phase_id, assignee_id)*<br>`GET    /api/v1/tasks/{id}`<br>`POST   /api/v1/tasks`<br>`PATCH  /api/v1/tasks/{id}`<br>`GET    /api/v1/my/tasks` | ceo, assigned team_member |
| **`submissions.py`** | `GET    /api/v1/submissions` *(filter: phase_id, project_id, user_id)*<br>`POST   /api/v1/submissions`<br>`GET    /api/v1/submissions/{id}` | authenticated |
| **`feedback.py`** | `GET    /api/v1/submissions/{id}/feedback`<br>`POST   /api/v1/submissions/{id}/feedback` | authenticated |
| **`checkpoints.py`** | `GET    /api/v1/projects/{id}/checkpoints`<br>`POST   /api/v1/projects/{id}/checkpoints` | ceo only |
| **`leaves.py`** | `GET    /api/v1/leaves` *(ceo: all; team: own)*<br>`POST   /api/v1/leaves`<br>`PATCH  /api/v1/leaves/{id}` *(ceo: approve/reject)* | ceo + team_member (own) |
| **`extensions.py`** | `GET    /api/v1/deadline-extensions` *(ceo: all; team: own)*<br>`POST   /api/v1/deadline-extensions`<br>`PATCH  /api/v1/deadline-extensions/{id}` *(ceo)* | ceo + team_member (own) |
| **`capture.py`** | `GET    /api/v1/capture/sessions`<br>`POST   /api/v1/capture/process` *(LLM parse + DB write atomic)*<br>`GET    /api/v1/capture/sessions/{id}`<br>`PATCH  /api/v1/capture/items/{id}` | authenticated (own only) |
| **`ai.py`** | `POST   /api/v1/ai/generate-plan`<br>`POST   /api/v1/ai/review`<br>`POST   /api/v1/ai/suggest-stack` | ceo (typically) |
| **`inbox.py`** | `GET    /api/v1/inbox` *(aggregator: pending leaves + extensions + flagged items)* | ceo only |
| **`health.py`** | `GET    /healthz` *(optional `?deep=1` for DB ping)* | public |

**Total: 14 routers, ~40 endpoints.**

### Hydrated reads (Option A confirmed)

Page-driving reads return one big nested payload to match how Next.js Server Components fetch today's Prisma trees in one call:

- **`GET /api/v1/projects`** — list of projects, each with its assignees (with `name`, `avatar_color`) and computed progress.
- **`GET /api/v1/projects/{id}`** — single project + phases + assignees (with users) + submissions (with feedback) + tasks (with assignees) + checkpoints. One round-trip per workspace page.
- **`GET /api/v1/inbox`** — pending leaves + pending extensions + flagged capture items, all in one payload.

Sub-resource endpoints (`GET /projects/{id}/phases`, etc.) are exposed for write paths and as escape hatches; the frontend prefers the hydrated reads.

---

## Section 3 — Database schema (Postgres)

### Cross-cutting changes from current Prisma schema

| Concern | Today (Prisma + SQLite) | After (Postgres + raw SQL) |
|---|---|---|
| Primary keys | `cuid()` strings | `uuid` with `gen_random_uuid()` default (via `pgcrypto`) |
| Column casing | `camelCase` | `snake_case` |
| Audit columns | only `createdAt` on most tables | `created_at timestamptz NOT NULL DEFAULT now()` everywhere; `updated_at timestamptz` on mutable tables; `created_by uuid` on `projects`, `checkpoints`, `capture_sessions` |
| JSON fields | `String` containing JSON | native `jsonb` |
| Enums | strings with comments | `CHECK (col IN (...))` constraints (flexible — easy to add values later via `DROP CONSTRAINT … ADD CONSTRAINT …`) |
| Date columns | `DateTime` | `timestamptz` consistently |
| Cascade behavior | inferred from Prisma | explicit `ON DELETE CASCADE` for child rows; `ON DELETE SET NULL` for soft refs |

### The 14 tables

```
users
  id uuid PK DEFAULT gen_random_uuid()
  name text NOT NULL
  email text NOT NULL UNIQUE
  role text NOT NULL                                          -- job title, free text
  role_type text NOT NULL CHECK (role_type IN ('ceo', 'team_member'))
  avatar_color text NOT NULL
  password_hash text NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz

projects
  id uuid PK DEFAULT gen_random_uuid()
  title text NOT NULL
  type text NOT NULL CHECK (type IN ('engineering', 'research'))
  requirement text
  status text NOT NULL CHECK (status IN ('active', 'completed', 'killed'))
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical'))
  current_phase text
  timebox_days int
  start_date timestamptz
  tech_stack jsonb
  ai_plan jsonb
  created_by uuid REFERENCES users(id)
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz

project_assignees
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  user_id    uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE
  assigned_at timestamptz NOT NULL DEFAULT now()
  PRIMARY KEY (project_id, user_id)

phases
  id uuid PK DEFAULT gen_random_uuid()
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  phase_name text NOT NULL
  status text NOT NULL CHECK (status IN ('pending', 'active', 'completed'))
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb
  "order" int NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz
  UNIQUE (project_id, "order")

tasks
  id uuid PK DEFAULT gen_random_uuid()
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE
  phase_id   uuid REFERENCES phases(id)   ON DELETE SET NULL
  assignee_id uuid REFERENCES users(id)   ON DELETE SET NULL
  title text NOT NULL
  description text
  due_date timestamptz
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical'))
  status text NOT NULL CHECK (status IN ('planning', 'in_progress', 'blocked', 'completed', 'killed'))
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz
  completed_at timestamptz

submissions
  id uuid PK DEFAULT gen_random_uuid()
  phase_id uuid REFERENCES phases(id) ON DELETE SET NULL
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE
  user_id uuid NOT NULL REFERENCES users(id)
  title text NOT NULL
  type text NOT NULL CHECK (type IN ('document', 'code', 'architecture', 'notebook', 'demo'))
  description text
  link text
  created_at timestamptz NOT NULL DEFAULT now()

feedback
  id uuid PK DEFAULT gen_random_uuid()
  submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE
  from_user_id uuid REFERENCES users(id)
  text text NOT NULL
  is_ai boolean NOT NULL DEFAULT false
  created_at timestamptz NOT NULL DEFAULT now()

checkpoints
  id uuid PK DEFAULT gen_random_uuid()
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE
  decision text NOT NULL CHECK (decision IN ('continue', 'kill'))
  notes text
  created_by uuid REFERENCES users(id)
  created_at timestamptz NOT NULL DEFAULT now()

leave_requests
  id uuid PK DEFAULT gen_random_uuid()
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  type text NOT NULL CHECK (type IN ('planned', 'sick', 'personal', 'wfh', 'half_day'))
  start_date date NOT NULL
  end_date date NOT NULL
  days numeric(4,1) NOT NULL
  reason text
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected'))
  approved_by_id uuid REFERENCES users(id)
  cover_person_id uuid REFERENCES users(id)
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz

deadline_extensions
  id uuid PK DEFAULT gen_random_uuid()
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE
  task_id uuid REFERENCES tasks(id) ON DELETE CASCADE
  requested_by_id uuid NOT NULL REFERENCES users(id)
  original_deadline timestamptz NOT NULL
  requested_deadline timestamptz NOT NULL
  reason text
  status text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'auto_escalated'))
  ceo_comment text
  approved_by_id uuid REFERENCES users(id)
  escalation_level int NOT NULL DEFAULT 0
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz

capture_sessions
  id uuid PK DEFAULT gen_random_uuid()
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE
  raw_input text NOT NULL
  created_at timestamptz NOT NULL DEFAULT now()

capture_items
  id uuid PK DEFAULT gen_random_uuid()
  session_id uuid NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE
  type text NOT NULL CHECK (type IN ('todo', 'follow_up', 'commitment', 'meeting', 'review', 'timeline'))
  raw_text text
  title text NOT NULL
  description text
  department text
  due_date timestamptz
  priority text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical'))
  status text NOT NULL CHECK (status IN ('pending', 'converted', 'dismissed'))
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL
  converted_to_type text
  converted_to_id uuid
  created_at timestamptz NOT NULL DEFAULT now()
  updated_at timestamptz

capture_item_assignees
  item_id uuid NOT NULL REFERENCES capture_items(id) ON DELETE CASCADE
  user_id uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE
  PRIMARY KEY (item_id, user_id)
```

### Indexes (created in initial migration)

```sql
CREATE INDEX idx_projects_status_created      ON projects (status, created_at DESC);
CREATE INDEX idx_tasks_assignee_status        ON tasks (assignee_id, status);
CREATE INDEX idx_tasks_project_phase          ON tasks (project_id, phase_id);
CREATE INDEX idx_submissions_project_created  ON submissions (project_id, created_at DESC);
CREATE INDEX idx_leave_requests_user_status   ON leave_requests (user_id, status);
CREATE INDEX idx_capture_sessions_user_created ON capture_sessions (user_id, created_at DESC);
-- users.email already UNIQUE
```

More indexes added later as query patterns warrant.

### Migrations

- **Tooling: Alembic** with raw SQL inside `op.execute("""...""")` — versioned, reversible, no SQLAlchemy ORM.
- **First revision** (`0001_initial.py`): `CREATE EXTENSION IF NOT EXISTS pgcrypto;` + all 14 tables + indexes.
- **`schema.sql`** at backend root: canonical DDL kept in sync with migrations. First-time bootstrap = `psql -f schema.sql`. Steady state = `alembic upgrade head`.
- **Seed**: `backend/scripts/seed.py` is idempotent — checks for existing rows by email/name and skips if found. Replaces `prisma/seed.ts`.

### Not migrated

- `dev.db` (SQLite) — wiped, not migrated.
- Prisma migration history in `prisma/migrations/` — deleted at frontend cleanup phase.

---

## Section 4 — Auth & frontend integration

### Strategy: HTTP-only cookie + Next.js proxy pattern

**JWT lives in a cookie set by Next.js.** Browser ↔ Next.js exchange uses cookies; Next.js ↔ FastAPI exchange uses `Authorization: Bearer <jwt>`. Backend never sees cookies.

### Token policy

- **Algorithm**: HS256 with shared secret (`JWT_SECRET` env var, ≥32 chars random).
- **Access token**: 1 month TTL. Payload: `{ user_id, role_type, exp, iat }`.
- **Refresh token**: 3 months TTL. Payload: `{ user_id, type: "refresh", exp, iat }`. Stored in a separate cookie (`ph_refresh`). Sent only to `/api/auth/refresh`.
- Both tokens issued by FastAPI on `POST /api/v1/auth/login`. Frontend Route Handler sets both as cookies.
- **Refresh flow**: when access token is within 7 days of expiry, frontend Route Handler proxy automatically calls `POST /api/v1/auth/refresh` with the refresh token; backend issues a new access token; new cookie set on the response.

### Cookies

| Name | Contents | TTL | Flags |
|---|---|---|---|
| `ph_session` | access token (JWT) | 1 month | `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/` |
| `ph_refresh` | refresh token (JWT) | 3 months | `HttpOnly`, `Secure` (prod), `SameSite=Lax`, `Path=/api/auth/refresh` |

### Surviving Next.js Route Handlers

Almost no Next.js API routes survive. Three small ones remain in `frontend/src/app/api/`:

```
frontend/src/app/api/auth/login/route.ts       # POST → FastAPI /auth/login → set cookies
frontend/src/app/api/auth/logout/route.ts      # clear cookies (no FastAPI call needed; tokens self-expire)
frontend/src/app/api/auth/refresh/route.ts     # POST → FastAPI /auth/refresh → set new ph_session cookie
frontend/src/app/api/proxy/[...path]/route.ts  # GET/POST/PATCH/DELETE — reads ph_session cookie, forwards to FastAPI with Bearer header
```

**Proxy pattern:** browser only ever talks to the Next.js origin (`http://localhost:3000` or `https://projecthub.app`). The proxy handler resolves `/api/proxy/v1/projects` → `${API_URL}/api/v1/projects` and forwards the request with `Authorization: Bearer <cookie-value>`. Eliminates cross-origin cookie issues; works regardless of which two domains the apps end up on.

### Frontend middleware

```
frontend/src/middleware.ts
```

- Checks `ph_session` cookie exists for protected routes.
- If missing → redirect to `/login?from=<original-path>`.
- **Does NOT decode the JWT** — just presence check. FastAPI is the truth source for "is this token valid". An expired token will return 401 from the API; the proxy handler maps 401 → cookie clear + redirect to `/login`.

### Server Component data fetching

Pattern shift from:

```ts
// Today
const user = await getSessionUser();
const projects = await prisma.project.findMany({ where: { ... } });
```

To:

```ts
// After
const user = await getSessionUser();                            // reads cookie + GETs /auth/me
const projects = await apiServerFetch<Project[]>("/v1/projects"); // wraps cookie + Bearer + envelope unwrap
```

Helper module `frontend/src/lib/api.ts`:

```ts
export async function apiServerFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ph_session")?.value;
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`, {
    ...init,
    headers: { ...init?.headers, Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    cache: "no-store",
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  const envelope = await res.json();
  return envelope.data as T;
}
```

Client components use a parallel `apiFetch` that hits `/api/proxy/...` (no token handling in the browser).

### Replacing NextAuth

| Today | After |
|---|---|
| `next-auth` package | uninstalled |
| `@auth/prisma-adapter` package | uninstalled |
| `bcryptjs` (frontend) | uninstalled (backend uses `bcrypt` instead) |
| `frontend/src/app/api/auth/[...nextauth]/route.ts` | deleted |
| `frontend/src/lib/auth.ts` (NextAuth config) | deleted |
| `frontend/src/lib/session.ts` | rewritten as cookie-reader + `/auth/me` caller |
| `frontend/src/types/next-auth.d.ts` | deleted (replaced by `frontend/src/types/api.ts`) |

### Login page

UI unchanged. Submits to `/api/auth/login` (the surviving Route Handler) instead of NextAuth's `signIn()`. Same UX.

---

## Section 5 — AI integration

### LLM stack

- **Wrapper**: [`litellm`](https://github.com/BerriAI/litellm) — unified Python SDK across providers.
- **Primary model**: `gemini/gemini-2.5-flash`
- **Fallback model**: `gemini/gemini-2.5-flash-lite` (auto-failover via LiteLLM's `fallbacks=[...]` parameter on rate limit / 5xx)
- **API key**: `GEMINI_API_KEY` env var (LiteLLM picks it up automatically for `gemini/` provider).

### Single shared helper (`app/ai.py`)

```python
import litellm

PRIMARY_MODEL  = "gemini/gemini-2.5-flash"
FALLBACK_MODEL = "gemini/gemini-2.5-flash-lite"

def call_llm(*, system: str, user: str, max_tokens: int = 1024) -> str:
    response = litellm.completion(
        model=PRIMARY_MODEL,
        fallbacks=[FALLBACK_MODEL],
        messages=[
            {"role": "system", "content": system},
            {"role": "user",   "content": user},
        ],
        max_tokens=max_tokens,
        timeout=60,
    )
    return response.choices[0].message.content or ""

def parse_json_response(text: str, fallback):
    """Strip markdown fences if present, parse JSON, return fallback on error."""
    import json, re
    cleaned = re.sub(r"^```(?:json)?\n?|\n?```$", "", text.strip())
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return fallback
```

Every AI router calls `call_llm()`. No model-per-route selection — all four endpoints get the same Flash + Flash-Lite fallback chain. Provider swap later = one-line change.

### The 4 AI endpoints

| Endpoint | Purpose | Notes |
|---|---|---|
| `POST /api/v1/capture/process` | Parse unstructured notes → `capture_items` array | Atomic: LLM call + insert session + insert items in one DB transaction |
| `POST /api/v1/ai/generate-plan` | Generate phases + checklist + tech stack from a project requirement | Used in `/projects/new` wizard |
| `POST /api/v1/ai/review` | Generate AI feedback for a submission | Saved as `feedback` row with `is_ai = true` |
| `POST /api/v1/ai/suggest-stack` | Suggest tech stack JSON from a description | Cheapest call, used in wizard |

### Prompts as Python modules (`app/prompts/`)

One module per feature, each exporting a `SYSTEM_PROMPT` constant. Existing prompts ported verbatim from current Next.js routes during migration.

```
backend/app/prompts/
├── capture.py           # CAPTURE_SYSTEM_PROMPT
├── generate_plan.py     # GENERATE_PLAN_SYSTEM_PROMPT
├── review.py            # REVIEW_SYSTEM_PROMPT
└── suggest_stack.py     # SUGGEST_STACK_SYSTEM_PROMPT
```

### Operational

- **No streaming in v1** — synchronous request/response. Frontend keeps existing spinner UX.
- **No prompt caching in v1** — short prompts, low volume; not worth the wiring.
- **Timeout**: 60s on the LLM client (`timeout=60` in `litellm.completion`).
- **Error handling**:
  - Provider error after fallback exhausted → `503` with `{ status: "failure", message: "AI service temporarily unavailable" }`.
  - JSON parse failure → return what we can salvage. For `capture/process`: persist session with empty `items` so user can retry. For `generate-plan` / `suggest-stack`: `502` with explicit message.
- **Tests**: unit tests mock `call_llm`. One opt-in integration test per endpoint (gated behind `RUN_AI_TESTS=1`) hits the real Gemini API to catch prompt regressions.

### Trade-off accepted

Gemini Flash is generally good but occasionally wraps JSON in markdown fences — `parse_json_response` strips them. No prompt caching the Anthropic way. Both acceptable at this volume.

---

## Section 6 — Migration roadmap & deployment

### 9-phase migration plan

Each phase ends with all tests passing and the app fully functional. No multi-week red builds.

| Phase | Scope | Frontend state after |
|---|---|---|
| **0. Repo restructure** | Move existing app into `frontend/`. Create empty `backend/`. Update root `README.md`. | Identical to today. |
| **1. Backend bootstrap** | FastAPI skeleton: `app/main.py`, `app/db.py`, `app/auth.py`, `app/responses.py`, `app/config.py`, `docker-compose.yml`, `Dockerfile`, `pyproject.toml`, `schema.sql`, Alembic init + first revision (all 14 tables), seed script, `GET /healthz`. | Identical to today. Backend exists, nothing wired in. |
| **2. Auth cutover** | FastAPI: `auth.py` router (login, refresh, me, logout). Frontend: 4 Route Handlers (`login`, `logout`, `refresh`, `proxy/[...path]`). NextAuth + adapter uninstalled. `getSessionUser()` rewritten. Middleware = cookie-presence check. | Login works through FastAPI. All other pages still use Prisma. |
| **3. Users + Projects** | FastAPI routers: `users.py`, `projects.py`, `phases.py`. Hydrated `GET /projects/{id}`. Frontend pages `/projects`, `/projects/[id]`, `/team`, `/team/manage` swap from Prisma → `apiServerFetch`. | Project & team pages on FastAPI. Tasks/leaves/extensions/capture still Prisma. |
| **4. Tasks + Submissions + Feedback + Checkpoints** | FastAPI routers: `tasks.py`, `submissions.py`, `feedback.py`, `checkpoints.py`. Workspace tabs swap over. | Full project workspace on FastAPI. |
| **5. Leaves + Extensions + Inbox** | FastAPI routers: `leaves.py`, `extensions.py`, `inbox.py` (aggregator). Frontend `/team` workflows + CEO inbox swap over. | CEO workflows on FastAPI. |
| **6. Capture + AI** | FastAPI routers: `capture.py` (with LiteLLM parse), `ai.py` (3 endpoints). LiteLLM + Gemini wired up. Frontend `/capture` and `/projects/new` AI wizard swap over. | Everything runs on FastAPI. |
| **7. Frontend cleanup** | `prisma/` directory, `dev.db`, `prisma` + `@prisma/*` packages uninstalled. `src/lib/queries/*` deleted. `src/lib/prisma.ts` deleted. Remaining `src/app/api/*` routes (other than the 4 auth helpers) deleted. | Frontend has no DB driver. Pure Next.js + FastAPI client. |
| **8. Deploy** | Local Postgres for now (per user). Production deploy to AWS deferred. | Local dev unchanged. |

### Migration mapping doc

Phase 0 also creates **`docs/migration-mapping.md`** — a living table of every old route and its new home, status (pending / in-progress / done), phase number, and notes. Single source of truth for "what's done vs pending" through the multi-week migration.

### Deployment topology (v1: local)

```
Browser ──cookie──> http://localhost:3000  (Next.js)
                          │
                          │ Bearer JWT (server-side fetch)
                          ▼
                    http://localhost:8000  (FastAPI in uvicorn)
                          │
                          ▼
                    localhost:5432         (Docker Postgres)
```

### Future deployment (deferred to a later release)

User has an AWS account; preferred future topology:
- **Backend** → ECS Fargate or Lambda (TBD when shipped)
- **Postgres** → RDS
- **Frontend** → Vercel or Amplify
- **Cookie domain** strategy decided at deploy time

### CI/CD (set up in Phase 8 or earlier as needed)

Two GitHub Actions workflows with path-filtered triggers:

- **`backend-ci.yml`** — on push to `backend/**`: ruff lint, mypy type-check, pytest with Postgres service container, build Docker image.
- **`frontend-ci.yml`** — on push to `frontend/**`: eslint, tsc, vitest, `next build`.

### Secrets & env vars

| Secret | Where it lives |
|---|---|
| `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `backend/.env.local` (dev), production env (later) |
| `JWT_SECRET` | `backend/.env.local` only (FastAPI signs/verifies; frontend never decodes) |
| `GEMINI_API_KEY` | `backend/.env.local` |
| `ALLOWED_ORIGINS` | `backend/.env.local` (= `http://localhost:3000`) |
| `NEXT_PUBLIC_API_URL` | `frontend/.env.local` (= `http://localhost:8000`) |

`.env.example` files committed in both apps with placeholders. Real `.env.local` gitignored.

---

## Acceptance criteria

When all 8 phases are complete:

1. `cd backend && uvicorn app.main:app --reload` starts FastAPI on `:8000`. `GET /healthz` returns 200. `GET /docs` shows OpenAPI for all 14 routers.
2. `cd frontend && npm run dev` starts Next.js on `:3000`. Every page works end-to-end (login, projects list, project workspace, team, leaves, extensions, capture, AI).
3. `frontend/package.json` has **no** `prisma`, `@prisma/*`, `next-auth`, `@auth/prisma-adapter`, or `bcryptjs` dependencies.
4. `frontend/src/app/api/` contains only `auth/login/`, `auth/logout/`, `auth/refresh/`, and `proxy/[...path]/`.
5. `frontend/src/lib/prisma.ts`, `frontend/prisma/`, `frontend/dev.db` do not exist.
6. `backend/app/routers/` has 14 router files; `OpenAPI` enumerates ~40 endpoints.
7. All AI endpoints succeed using Gemini Flash (with auto-failover to Flash-Lite verifiable via temporarily blocking the primary).
8. `pytest backend/tests/` passes. `npm test` in `frontend/` passes.
9. `docs/migration-mapping.md` shows all routes migrated.

## Out of scope

- AWS / production deployment (deferred).
- Mobile app implementation (API designed to support, not built).
- Streaming AI responses (SSE) — synchronous only in v1.
- Prompt caching — not implemented in v1.
- Real-time collaboration / websockets — not in v1.
- Multi-tenancy / public signup — not in v1.
- Soft-delete on users — not in v1.
- Rate limiting on the API — not in v1; add later if abuse appears.
- Background jobs / queues — not in v1; all work is request-response.
