# Backend Phase 1 — Bootstrap Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up a FastAPI + Postgres backend skeleton inside `backend/` that boots, connects to a local Dockerized Postgres, applies the full 14-table schema via Alembic, serves `GET /healthz`, has a passing pytest suite, and ships an idempotent seed script. The frontend is **not touched** in this phase.

**Architecture:** Per `docs/fastapi-backend-stack.md` conventions: `app/main.py` exposes a single `FastAPI` instance with CORS + a global exception handler + per-domain routers. `app/db.py` owns a single `psycopg_pool.ConnectionPool` (psycopg v3); routes check out connections per request. `app/config.py` loads env via `pydantic-settings`. `app/responses.py` enforces the `{status, message, data}` envelope. Schema lives canonically in `backend/schema.sql` and is mirrored by `migrations/versions/0001_initial.py` (Alembic with raw SQL inside `op.execute(...)`). The only domain router in this phase is `health.py` — auth, projects, etc. ship in later phases.

**Tech Stack:** Python 3.12, FastAPI, psycopg v3 + connection pool (raw SQL — no ORM), Pydantic v2 + pydantic-settings, Alembic (with raw-SQL revisions), pytest + httpx, Postgres 16 (Docker), uvicorn (dev), gunicorn + uvicorn workers (prod Dockerfile).

**Spec source:** `docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md` — Sections 1, 3, and Section 6 Phase 1.

**Branch:** `feature/backend-phase-1-bootstrap` (cut from `feature/backend-phase-0-restructure`)

---

## Decisions locked

| Topic | Decision | Why |
|---|---|---|
| `app/auth.py` | **Deferred to Phase 2** | The spec lists it as a Phase 1 deliverable, but auth helpers (`get_current_user`, `require_roles`, JWT encode/decode) only get exercised by login/me/refresh routes which are Phase 2. Building them in Phase 1 means thin unit tests with no integration coverage. Phase 2's plan picks up `app/auth.py` from the start. |
| Python deps | Only **Phase 1 dependencies** in `pyproject.toml` (FastAPI, psycopg, pydantic-settings, alembic, uvicorn, pytest, httpx, ruff, mypy) | YAGNI — Phase 2 adds `pyjwt`+`bcrypt`, Phase 6 adds `litellm`. Adds 2 lines per phase, no churn. |
| Schema source-of-truth | **`backend/schema.sql`** (canonical) **mirrored** by `migrations/versions/0001_initial.py` (Alembic raw SQL) | First-time devs run `psql -f schema.sql` for speed; CI / production uses `alembic upgrade head`. Both produce identical DBs. Future revisions are incremental Alembic only. |
| Postgres ID generation | `gen_random_uuid()` from `pgcrypto` extension | spec rule (UUID PKs end-to-end). Enabled once in 0001 migration. |
| Test database isolation | Separate `projecthub_test` DB created/torn down by pytest fixture | matches the IAS test pattern; avoids test pollution of dev data. |
| psycopg version | **psycopg v3** (with `[pool]` extra) | per skill default; better async story than psycopg2; cleanly supports the connection pool we need. |
| Local Postgres provisioning | **User's existing native Postgres install (pgAdmin)** on `:5432` — no Docker | Decided during execution (2026-05-09): user already has a local Postgres install and a `projecthub` database. Skipping Docker avoids port conflicts and matches the user's existing tooling. Phase 1 production `Dockerfile` is unaffected (it targets cloud deploy, not local dev). |
| Connection lifecycle | Single `ConnectionPool` opened at FastAPI startup, closed at shutdown via lifespan handler | one pool, route functions check out a connection per request; matches skill rule. |
| `GET /healthz` shape | Default returns `{status: "success", data: {ok: true}}`. With `?deep=1`, executes `SELECT 1` against DB and includes `db: "ok"` in payload (or `503` on failure) | gives us a real probe for both load balancer + manual debugging. |
| Test fixture data scope | Tests use **fresh tables per test class** — fixture truncates all tables in dependency order before each class | faster than recreating schema; simpler than per-test isolation. |
| `app/auth.py` placeholder file | **Not created** in Phase 1 — Phase 2 creates it | keeps Phase 1 surface tight. |
| Dockerfile | Production-only target — `gunicorn -k uvicorn.workers.UvicornWorker` | Phase 1 deliverable per spec. Local dev uses `uvicorn --reload` directly, not Docker. |
| `backend/.gitkeep` | Deleted in this plan (real files now exist) | placeholder no longer needed. |

---

## File structure (after this plan)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                  # FastAPI() + CORSMiddleware + include_router(health) + lifespan
│   ├── config.py                # Settings(BaseSettings) — DB_*, JWT_SECRET, ALLOWED_ORIGINS, GEMINI_API_KEY
│   ├── db.py                    # ConnectionPool singleton + get_conn() context manager
│   ├── responses.py             # ok(), fail() — {status, message, data} envelope
│   ├── exceptions.py            # AppError + global FastAPI exception handler
│   └── routers/
│       ├── __init__.py
│       └── health.py            # GET /healthz (with optional ?deep=1)
├── migrations/
│   ├── env.py                   # Alembic config wired to settings.db_url
│   ├── script.py.mako           # Alembic-generated template
│   └── versions/
│       └── 0001_initial.py      # raw-SQL upgrade() / downgrade() — all 14 tables + indexes
├── scripts/
│   └── seed.py                  # idempotent: 1 ceo + 4 team members + 2 sample projects
├── tests/
│   ├── __init__.py
│   ├── conftest.py              # fixtures: test_db, client (TestClient)
│   ├── test_config.py
│   ├── test_responses.py
│   ├── test_exceptions.py
│   ├── test_db.py
│   ├── test_health.py
│   └── test_schema.py           # introspection: all tables + columns + indexes exist after migration
├── Dockerfile                   # python:3.12-slim, gunicorn+uvicorn workers
├── pyproject.toml               # PEP 621, deps + dev deps + ruff + mypy config
├── alembic.ini                  # script_location, sqlalchemy.url placeholder (overridden by env.py)
├── schema.sql                   # canonical DDL — pgcrypto + 14 tables + 6 indexes
├── .env.example                 # template; real values in .env.local (gitignored)
└── README.md                    # quickstart: docker compose, alembic upgrade, uvicorn
```

`backend/.gitkeep` is removed (Task 16 Step 1).

---

## Tasks

### Task 1: Cut branch + Phase 0 sanity check

**Files:** none (git ops only)

- [ ] **Step 1: Verify Phase 0 branch state**

```bash
cd D:/work-space/task/ProjectHub
git status
git log -3 --oneline
```

Expected: working tree clean (modulo `frontend/dev.db` which churns from frontend tests). HEAD should be `334ab61 chore(gitignore): scope frontend artifacts; drop tracked test sqlite files` or later. If frontend changes are unstaged, **stop** — investigate before proceeding.

- [ ] **Step 2: Cut new branch**

```bash
git checkout feature/backend-phase-0-restructure
git pull origin feature/backend-phase-0-restructure
git checkout -b feature/backend-phase-1-bootstrap
```

Expected: `Switched to a new branch 'feature/backend-phase-1-bootstrap'`.

- [ ] **Step 3: Verify Python 3.12 is available**

```bash
python --version
```

Expected: `Python 3.12.x` (any 3.12 patch). If only an older version is installed, install Python 3.12 before continuing — this plan assumes 3.12 features.

- [ ] **Step 4: Verify Docker is available**

```bash
docker --version
docker compose version
```

Expected: Docker Engine running, compose v2+. If Docker isn't installed or not running, **stop** — Postgres needs to come up via compose.

---

### Task 2: Python project skeleton

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/.env.example`
- Create: `backend/app/__init__.py`
- Create: `backend/app/routers/__init__.py`
- Create: `backend/tests/__init__.py`

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "projecthub-backend"
version = "0.1.0"
description = "ProjectHub FastAPI backend — see docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md"
requires-python = ">=3.12"
dependencies = [
    "fastapi>=0.115,<0.117",
    "uvicorn[standard]>=0.30,<0.34",
    "psycopg[pool,binary]>=3.2,<3.3",
    "pydantic>=2.9,<3",
    "pydantic-settings>=2.5,<3",
    "alembic>=1.13,<2",
]

[project.optional-dependencies]
dev = [
    "pytest>=8.3,<9",
    "httpx>=0.27,<0.29",
    "ruff>=0.6,<1",
    "mypy>=1.11,<2",
]
prod = [
    "gunicorn>=23.0,<24",
]

[build-system]
requires = ["setuptools>=68"]
build-backend = "setuptools.build_meta"

[tool.setuptools.packages.find]
include = ["app*"]
exclude = ["tests*", "scripts*", "migrations*"]

[tool.ruff]
line-length = 100
target-version = "py312"

[tool.ruff.lint]
select = ["E", "F", "I", "B", "UP", "N"]
ignore = ["E501"]  # line-length handled by formatter

[tool.mypy]
python_version = "3.12"
strict = true
ignore_missing_imports = true

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = "test_*.py"
addopts = "-q --tb=short"
```

- [ ] **Step 2: Create `backend/.env.example`**

```
# Database (local Postgres via docker-compose)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=projecthub
DB_USER=postgres
DB_PASSWORD=your_postgres_password

# Auth (used in Phase 2)
JWT_SECRET=change-me-to-a-32-char-random-string

# CORS (frontend origins)
ALLOWED_ORIGINS=http://localhost:3000

# AI (used in Phase 6)
GEMINI_API_KEY=your_gemini_api_key
```

- [ ] **Step 3: Create empty `__init__.py` files for packages**

```bash
touch backend/app/__init__.py
mkdir -p backend/app/routers
touch backend/app/routers/__init__.py
mkdir -p backend/tests
touch backend/tests/__init__.py
```

- [ ] **Step 4: Create the virtualenv and install deps**

```bash
cd backend
python -m venv .venv
# On Windows bash:
source .venv/Scripts/activate
# On macOS/Linux: source .venv/bin/activate
pip install --upgrade pip
pip install -e ".[dev,prod]"
```

Expected: deps install cleanly. `pip list` shows fastapi, uvicorn, psycopg, pydantic, pydantic-settings, alembic, pytest, httpx, ruff, mypy, gunicorn.

- [ ] **Step 5: Verify pytest can be invoked (it'll find no tests yet — that's fine)**

```bash
pytest
```

Expected output: `no tests ran in 0.0Xs`. No errors about config/imports.

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/pyproject.toml backend/.env.example backend/app/__init__.py backend/app/routers/__init__.py backend/tests/__init__.py
git commit -m "$(cat <<'EOF'
feat(backend): pyproject.toml + package skeleton

- Python 3.12 project with FastAPI, psycopg v3, pydantic-settings,
  alembic, uvicorn for production code; pytest, httpx, ruff, mypy
  for dev; gunicorn for prod.
- Empty __init__.py files for app/, app/routers/, tests/.
- .env.example documents DB_*, JWT_SECRET (Phase 2), ALLOWED_ORIGINS,
  GEMINI_API_KEY (Phase 6) — real values go in .env.local (gitignored).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: Verify local Postgres + create test database

**Files:** none (verification + create-DB only)

This task originally created a `docker-compose.yml`. Per the executor's machine setup, we instead use the user's pre-existing native Postgres install. No Docker container is started.

- [ ] **Step 1: Confirm the local Postgres is running and `projecthub` exists**

Activate the venv (so `psycopg` is available) and run a connection test:

```bash
cd backend
source .venv/Scripts/activate    # Windows Git Bash; macOS/Linux: source .venv/bin/activate
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub') as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT version()')
        print('Connected:', cur.fetchone()[0])
        cur.execute('SELECT current_database()')
        print('Database:', cur.fetchone()[0])
"
```

Expected: a Postgres version banner and `Database: projecthub`.

If this fails with `connection refused`, your local Postgres service isn't running — start it via `pgAdmin` (or Windows `services.msc` for `postgresql-x64-XX`) and retry. If it fails with `password authentication failed`, your local Postgres password isn't `postgres`; update `backend/.env.local` (gitignored) with the real password before continuing.

- [ ] **Step 2: Create the `projecthub_test` database (used by pytest fixtures later)**

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/postgres', autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute(\"SELECT 1 FROM pg_database WHERE datname = 'projecthub_test'\")
        if cur.fetchone():
            print('projecthub_test already exists')
        else:
            cur.execute('CREATE DATABASE projecthub_test')
            print('Created projecthub_test')
"
```

- [ ] **Step 3: Verify `pgcrypto` extension is available (will be installed in Task 5's migration)**

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub') as conn:
    with conn.cursor() as cur:
        cur.execute(\"SELECT count(*) FROM pg_available_extensions WHERE name = 'pgcrypto'\")
        assert cur.fetchone()[0] == 1, 'pgcrypto extension is not available on this Postgres install'
        print('pgcrypto extension is available')
"
```

Expected: `pgcrypto extension is available`. If this fails, install postgresql-contrib (Linux/Mac) or reinstall Postgres with the contrib modules selected (Windows).

- [ ] **Step 4: Confirm `backend/.env.local` exists with valid creds**

```bash
test -f backend/.env.local && echo "OK .env.local present" || echo "MISSING — create from .env.example"
```

If missing, create `backend/.env.local` (gitignored) with:

```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=projecthub
DB_USER=postgres
DB_PASSWORD=postgres
JWT_SECRET=dev-jwt-secret-change-in-production-32+
ALLOWED_ORIGINS=http://localhost:3000
GEMINI_API_KEY=
```

Adjust `DB_PASSWORD` to your actual local Postgres password if it isn't `postgres`.

- [ ] **Step 5: No commit — this task creates no tracked files.**

Skip the commit step. The change to "use local Postgres instead of Docker" is captured in the Decisions Locked table at the top of the plan and in the docker-compose-removal commit (a separate cleanup commit).

---

### Task 4: schema.sql — full DDL for 14 tables

**Files:**
- Create: `backend/schema.sql`

- [ ] **Step 1: Create `backend/schema.sql` with full DDL**

Open `backend/schema.sql` and write the complete contents:

```sql
-- ProjectHub backend canonical schema.
-- Source of truth: this file. Mirrored by migrations/versions/0001_initial.py.
-- First-time bootstrap: psql -f schema.sql
-- Steady state: alembic upgrade head

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- users
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name          text NOT NULL,
    email         text NOT NULL UNIQUE,
    role          text NOT NULL,
    role_type     text NOT NULL CHECK (role_type IN ('ceo', 'team_member')),
    avatar_color  text NOT NULL,
    password_hash text NOT NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz
);

-- =====================================================================
-- projects
-- =====================================================================
CREATE TABLE IF NOT EXISTS projects (
    id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title          text NOT NULL,
    type           text NOT NULL CHECK (type IN ('engineering', 'research')),
    requirement    text,
    status         text NOT NULL CHECK (status IN ('active', 'completed', 'killed')),
    priority       text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    current_phase  text,
    timebox_days   int,
    start_date     timestamptz,
    tech_stack     jsonb,
    ai_plan        jsonb,
    created_by     uuid REFERENCES users(id),
    created_at     timestamptz NOT NULL DEFAULT now(),
    updated_at     timestamptz
);

CREATE INDEX IF NOT EXISTS idx_projects_status_created
    ON projects (status, created_at DESC);

-- =====================================================================
-- project_assignees (M:N users <-> projects)
-- =====================================================================
CREATE TABLE IF NOT EXISTS project_assignees (
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- =====================================================================
-- phases
-- =====================================================================
CREATE TABLE IF NOT EXISTS phases (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    phase_name text NOT NULL,
    status     text NOT NULL CHECK (status IN ('pending', 'active', 'completed')),
    checklist  jsonb NOT NULL DEFAULT '[]'::jsonb,
    "order"    int NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz,
    UNIQUE (project_id, "order")
);

-- =====================================================================
-- tasks
-- =====================================================================
CREATE TABLE IF NOT EXISTS tasks (
    id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
    phase_id     uuid REFERENCES phases(id)   ON DELETE SET NULL,
    assignee_id  uuid REFERENCES users(id)    ON DELETE SET NULL,
    title        text NOT NULL,
    description  text,
    due_date     timestamptz,
    priority     text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status       text NOT NULL CHECK (status IN ('planning', 'in_progress', 'blocked', 'completed', 'killed')),
    created_at   timestamptz NOT NULL DEFAULT now(),
    updated_at   timestamptz,
    completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks (assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase  ON tasks (project_id, phase_id);

-- =====================================================================
-- submissions
-- =====================================================================
CREATE TABLE IF NOT EXISTS submissions (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    phase_id    uuid REFERENCES phases(id) ON DELETE SET NULL,
    project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id),
    title       text NOT NULL,
    type        text NOT NULL CHECK (type IN ('document', 'code', 'architecture', 'notebook', 'demo')),
    description text,
    link        text,
    created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_submissions_project_created ON submissions (project_id, created_at DESC);

-- =====================================================================
-- feedback
-- =====================================================================
CREATE TABLE IF NOT EXISTS feedback (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    from_user_id  uuid REFERENCES users(id),
    text          text NOT NULL,
    is_ai         boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- checkpoints
-- =====================================================================
CREATE TABLE IF NOT EXISTS checkpoints (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    decision   text NOT NULL CHECK (decision IN ('continue', 'kill')),
    notes      text,
    created_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- leave_requests
-- =====================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
    id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            text NOT NULL CHECK (type IN ('planned', 'sick', 'personal', 'wfh', 'half_day')),
    start_date      date NOT NULL,
    end_date        date NOT NULL,
    days            numeric(4,1) NOT NULL,
    reason          text,
    status          text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
    approved_by_id  uuid REFERENCES users(id),
    cover_person_id uuid REFERENCES users(id),
    created_at      timestamptz NOT NULL DEFAULT now(),
    updated_at      timestamptz
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_status ON leave_requests (user_id, status);

-- =====================================================================
-- deadline_extensions
-- =====================================================================
CREATE TABLE IF NOT EXISTS deadline_extensions (
    id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id         uuid REFERENCES projects(id) ON DELETE CASCADE,
    task_id            uuid REFERENCES tasks(id) ON DELETE CASCADE,
    requested_by_id    uuid NOT NULL REFERENCES users(id),
    original_deadline  timestamptz NOT NULL,
    requested_deadline timestamptz NOT NULL,
    reason             text,
    status             text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'auto_escalated')),
    ceo_comment        text,
    approved_by_id     uuid REFERENCES users(id),
    escalation_level   int NOT NULL DEFAULT 0,
    created_at         timestamptz NOT NULL DEFAULT now(),
    updated_at         timestamptz
);

-- =====================================================================
-- capture_sessions
-- =====================================================================
CREATE TABLE IF NOT EXISTS capture_sessions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_input  text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capture_sessions_user_created ON capture_sessions (user_id, created_at DESC);

-- =====================================================================
-- capture_items
-- =====================================================================
CREATE TABLE IF NOT EXISTS capture_items (
    id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        uuid NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
    type              text NOT NULL CHECK (type IN ('todo', 'follow_up', 'commitment', 'meeting', 'review', 'timeline')),
    raw_text          text,
    title             text NOT NULL,
    description       text,
    department        text,
    due_date          timestamptz,
    priority          text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status            text NOT NULL CHECK (status IN ('pending', 'converted', 'dismissed')),
    project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
    converted_to_type text,
    converted_to_id   uuid,
    created_at        timestamptz NOT NULL DEFAULT now(),
    updated_at        timestamptz
);

-- =====================================================================
-- capture_item_assignees
-- =====================================================================
CREATE TABLE IF NOT EXISTS capture_item_assignees (
    item_id uuid NOT NULL REFERENCES capture_items(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    PRIMARY KEY (item_id, user_id)
);
```

- [ ] **Step 2: Apply schema.sql to local Postgres to verify it parses**

Use Python via psycopg (works regardless of whether `psql` is on PATH on Windows). From the `backend/` directory with the venv active:

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', autocommit=True) as conn:
    with conn.cursor() as cur:
        with open('schema.sql', 'r', encoding='utf-8') as f:
            cur.execute(f.read())
print('schema.sql applied successfully')
"
```

Expected: `schema.sql applied successfully`. No exceptions raised.

- [ ] **Step 3: Verify all tables exist**

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub') as conn:
    with conn.cursor() as cur:
        cur.execute(\"\"\"
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        \"\"\")
        tables = [row[0] for row in cur.fetchall()]
        print(len(tables), 'tables:', tables)
"
```

Expected: **13 tables** — `capture_item_assignees`, `capture_items`, `capture_sessions`, `checkpoints`, `deadline_extensions`, `feedback`, `leave_requests`, `phases`, `project_assignees`, `projects`, `submissions`, `tasks`, `users`. (The spec says "14 tables" but counts `pgcrypto` as a top-level item; the actual user-data table count is 13.)

- [ ] **Step 4: Drop tables to give Alembic (Task 5) a clean slate**

The schema.sql we just applied will collide with Alembic's 0001 migration. Drop it now:

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute('DROP SCHEMA public CASCADE; CREATE SCHEMA public;')
        cur.execute('GRANT ALL ON SCHEMA public TO postgres;')
        cur.execute('GRANT ALL ON SCHEMA public TO public;')
print('public schema reset')
"
```

Expected: `public schema reset`. Task 5 will reapply the same DDL via Alembic, this time tracked by `alembic_version`.

- [ ] **Step 5: Commit**

```bash
git add backend/schema.sql
git commit -m "$(cat <<'EOF'
feat(backend): canonical schema.sql with all 13 tables + indexes

Mirrors the spec's Section 3 schema design:
- pgcrypto extension for gen_random_uuid()
- 13 tables: users, projects, project_assignees, phases, tasks,
  submissions, feedback, checkpoints, leave_requests,
  deadline_extensions, capture_sessions, capture_items,
  capture_item_assignees
- 6 indexes: projects(status,created_at), tasks(assignee,status),
  tasks(project,phase), submissions(project,created_at),
  leave_requests(user,status), capture_sessions(user,created_at)
- All PKs uuid with gen_random_uuid() default
- snake_case columns, jsonb for flexible fields, timestamptz for dates
- CHECK constraints on enums (status/type/priority/role_type)
- ON DELETE CASCADE for child rows; SET NULL for soft refs

Idempotent (CREATE ... IF NOT EXISTS) so re-applying is safe.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: Alembic init + 0001_initial migration

**Files:**
- Create: `backend/alembic.ini`
- Create: `backend/migrations/env.py`
- Create: `backend/migrations/script.py.mako`
- Create: `backend/migrations/versions/0001_initial.py`

- [ ] **Step 1: Initialize Alembic structure manually**

Alembic ships an `alembic init` command but it expects to scaffold a fresh layout. We're using a custom layout (no SQLAlchemy ORM), so we hand-write the files instead.

Create `backend/alembic.ini`:

```ini
[alembic]
script_location = migrations
prepend_sys_path = .
file_template = %%(rev)s_%%(slug)s
timezone = UTC
sqlalchemy.url = postgresql://placeholder

[loggers]
keys = root,sqlalchemy,alembic

[handlers]
keys = console

[formatters]
keys = generic

[logger_root]
level = WARN
handlers = console
qualname =

[logger_sqlalchemy]
level = WARN
handlers =
qualname = sqlalchemy.engine

[logger_alembic]
level = INFO
handlers =
qualname = alembic

[handler_console]
class = StreamHandler
args = (sys.stderr,)
level = NOTSET
formatter = generic

[formatter_generic]
format = %(levelname)-5.5s [%(name)s] %(message)s
datefmt = %H:%M:%S
```

The `sqlalchemy.url = postgresql://placeholder` is intentional — `env.py` overrides it from `app.config`.

- [ ] **Step 2: Create `backend/migrations/env.py`**

```python
"""Alembic environment — wires settings.db_url into the migration runner."""

from logging.config import fileConfig

from alembic import context
from sqlalchemy import engine_from_config, pool

from app.config import settings

# Alembic Config object
config = context.config

# Override the sqlalchemy.url placeholder with the runtime DB URL.
# Force the psycopg v3 driver — SQLAlchemy's default postgresql:// scheme
# tries to load psycopg2 (v2). We use psycopg v3 in app.db; no need to
# install psycopg2 just for migrations.
config.set_main_option(
    "sqlalchemy.url",
    settings.db_url.replace("postgresql://", "postgresql+psycopg://", 1),
)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

# We don't use SQLAlchemy ORM models — migrations are raw SQL.
target_metadata = None


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode — emits SQL to stdout."""
    context.configure(
        url=config.get_main_option("sqlalchemy.url"),
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations against a live DB connection."""
    connectable = engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )
    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
```

- [ ] **Step 3: Create `backend/migrations/script.py.mako`**

```mako
"""${message}

Revision ID: ${up_revision}
Revises: ${down_revision | comma,n}
Create Date: ${create_date}

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = ${repr(up_revision)}
down_revision: Union[str, None] = ${repr(down_revision)}
branch_labels: Union[str, Sequence[str], None] = ${repr(branch_labels)}
depends_on: Union[str, Sequence[str], None] = ${repr(depends_on)}


def upgrade() -> None:
    ${upgrades if upgrades else "pass"}


def downgrade() -> None:
    ${downgrades if downgrades else "pass"}
```

- [ ] **Step 4: Create `backend/migrations/versions/0001_initial.py`**

This file's `upgrade()` runs the same DDL as `schema.sql` (full duplication). `downgrade()` drops everything in reverse-dependency order.

```python
"""initial schema — 13 tables + indexes + pgcrypto

Revision ID: 0001
Revises:
Create Date: 2026-05-09

"""

from typing import Sequence, Union

from alembic import op


revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.execute("""
        CREATE TABLE users (
            id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name          text NOT NULL,
            email         text NOT NULL UNIQUE,
            role          text NOT NULL,
            role_type     text NOT NULL CHECK (role_type IN ('ceo', 'team_member')),
            avatar_color  text NOT NULL,
            password_hash text NOT NULL,
            created_at    timestamptz NOT NULL DEFAULT now(),
            updated_at    timestamptz
        );
    """)

    op.execute("""
        CREATE TABLE projects (
            id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title          text NOT NULL,
            type           text NOT NULL CHECK (type IN ('engineering', 'research')),
            requirement    text,
            status         text NOT NULL CHECK (status IN ('active', 'completed', 'killed')),
            priority       text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            current_phase  text,
            timebox_days   int,
            start_date     timestamptz,
            tech_stack     jsonb,
            ai_plan        jsonb,
            created_by     uuid REFERENCES users(id),
            created_at     timestamptz NOT NULL DEFAULT now(),
            updated_at     timestamptz
        );
    """)
    op.execute("CREATE INDEX idx_projects_status_created ON projects (status, created_at DESC);")

    op.execute("""
        CREATE TABLE project_assignees (
            project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id     uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
            assigned_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (project_id, user_id)
        );
    """)

    op.execute("""
        CREATE TABLE phases (
            id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            phase_name text NOT NULL,
            status     text NOT NULL CHECK (status IN ('pending', 'active', 'completed')),
            checklist  jsonb NOT NULL DEFAULT '[]'::jsonb,
            "order"    int NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz,
            UNIQUE (project_id, "order")
        );
    """)

    op.execute("""
        CREATE TABLE tasks (
            id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
            phase_id     uuid REFERENCES phases(id)   ON DELETE SET NULL,
            assignee_id  uuid REFERENCES users(id)    ON DELETE SET NULL,
            title        text NOT NULL,
            description  text,
            due_date     timestamptz,
            priority     text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            status       text NOT NULL CHECK (status IN ('planning', 'in_progress', 'blocked', 'completed', 'killed')),
            created_at   timestamptz NOT NULL DEFAULT now(),
            updated_at   timestamptz,
            completed_at timestamptz
        );
    """)
    op.execute("CREATE INDEX idx_tasks_assignee_status ON tasks (assignee_id, status);")
    op.execute("CREATE INDEX idx_tasks_project_phase ON tasks (project_id, phase_id);")

    op.execute("""
        CREATE TABLE submissions (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            phase_id    uuid REFERENCES phases(id) ON DELETE SET NULL,
            project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
            user_id     uuid NOT NULL REFERENCES users(id),
            title       text NOT NULL,
            type        text NOT NULL CHECK (type IN ('document', 'code', 'architecture', 'notebook', 'demo')),
            description text,
            link        text,
            created_at  timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_submissions_project_created ON submissions (project_id, created_at DESC);")

    op.execute("""
        CREATE TABLE feedback (
            id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            from_user_id  uuid REFERENCES users(id),
            text          text NOT NULL,
            is_ai         boolean NOT NULL DEFAULT false,
            created_at    timestamptz NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE checkpoints (
            id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            decision   text NOT NULL CHECK (decision IN ('continue', 'kill')),
            notes      text,
            created_by uuid REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE leave_requests (
            id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type            text NOT NULL CHECK (type IN ('planned', 'sick', 'personal', 'wfh', 'half_day')),
            start_date      date NOT NULL,
            end_date        date NOT NULL,
            days            numeric(4,1) NOT NULL,
            reason          text,
            status          text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
            approved_by_id  uuid REFERENCES users(id),
            cover_person_id uuid REFERENCES users(id),
            created_at      timestamptz NOT NULL DEFAULT now(),
            updated_at      timestamptz
        );
    """)
    op.execute("CREATE INDEX idx_leave_requests_user_status ON leave_requests (user_id, status);")

    op.execute("""
        CREATE TABLE deadline_extensions (
            id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id         uuid REFERENCES projects(id) ON DELETE CASCADE,
            task_id            uuid REFERENCES tasks(id) ON DELETE CASCADE,
            requested_by_id    uuid NOT NULL REFERENCES users(id),
            original_deadline  timestamptz NOT NULL,
            requested_deadline timestamptz NOT NULL,
            reason             text,
            status             text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'auto_escalated')),
            ceo_comment        text,
            approved_by_id     uuid REFERENCES users(id),
            escalation_level   int NOT NULL DEFAULT 0,
            created_at         timestamptz NOT NULL DEFAULT now(),
            updated_at         timestamptz
        );
    """)

    op.execute("""
        CREATE TABLE capture_sessions (
            id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            raw_input  text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_capture_sessions_user_created ON capture_sessions (user_id, created_at DESC);")

    op.execute("""
        CREATE TABLE capture_items (
            id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id        uuid NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
            type              text NOT NULL CHECK (type IN ('todo', 'follow_up', 'commitment', 'meeting', 'review', 'timeline')),
            raw_text          text,
            title             text NOT NULL,
            description       text,
            department        text,
            due_date          timestamptz,
            priority          text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            status            text NOT NULL CHECK (status IN ('pending', 'converted', 'dismissed')),
            project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
            converted_to_type text,
            converted_to_id   uuid,
            created_at        timestamptz NOT NULL DEFAULT now(),
            updated_at        timestamptz
        );
    """)

    op.execute("""
        CREATE TABLE capture_item_assignees (
            item_id uuid NOT NULL REFERENCES capture_items(id) ON DELETE CASCADE,
            user_id uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
            PRIMARY KEY (item_id, user_id)
        );
    """)


def downgrade() -> None:
    # Reverse-dependency order
    op.execute("DROP TABLE IF EXISTS capture_item_assignees;")
    op.execute("DROP TABLE IF EXISTS capture_items;")
    op.execute("DROP TABLE IF EXISTS capture_sessions;")
    op.execute("DROP TABLE IF EXISTS deadline_extensions;")
    op.execute("DROP TABLE IF EXISTS leave_requests;")
    op.execute("DROP TABLE IF EXISTS checkpoints;")
    op.execute("DROP TABLE IF EXISTS feedback;")
    op.execute("DROP TABLE IF EXISTS submissions;")
    op.execute("DROP TABLE IF EXISTS tasks;")
    op.execute("DROP TABLE IF EXISTS phases;")
    op.execute("DROP TABLE IF EXISTS project_assignees;")
    op.execute("DROP TABLE IF EXISTS projects;")
    op.execute("DROP TABLE IF EXISTS users;")
    # Leave pgcrypto extension in place — other revisions may rely on it
```

- [ ] **Step 5: Reset DB state and apply via Alembic to confirm it works**

This step depends on `app/config.py` existing — but Task 6 creates that. To unblock the migration test now, create a **minimum** `app/config.py` here that we'll properly flesh out in Task 6:

Wait — the order matters. Reorder: do Task 6 (`app/config.py`) before this step. The plan presents tasks in dependency order; the file you're reading right now should already reflect that. **Skip Step 5–6 of this task and come back after Task 6.** Specifically: complete this task's Steps 1–4 (write the files), commit them in Step 7, then revisit Steps 5–6 after Task 6 lands.

- [ ] **Step 6: (Deferred — see Step 5 note) Apply migration**

After Task 6 establishes `app/config.py`:

```bash
cd backend
source .venv/Scripts/activate    # or .venv/bin/activate on Unix
# Task 4 Step 4 already reset the public schema. Apply via Alembic:
alembic upgrade head
```

Expected output: `INFO  [alembic.runtime.migration] Running upgrade  -> 0001, initial schema — 13 tables + indexes + pgcrypto`. No errors.

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub') as conn:
    with conn.cursor() as cur:
        cur.execute(\"\"\"
            SELECT table_name FROM information_schema.tables
            WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
            ORDER BY table_name
        \"\"\")
        print(*[row[0] for row in cur.fetchall()], sep='\n')
"
```

Expected: 14 tables (13 user tables + `alembic_version`).

- [ ] **Step 7: Commit (after Steps 1–4 and tasks 6 onward)**

```bash
git add backend/alembic.ini backend/migrations/
git commit -m "$(cat <<'EOF'
feat(backend): Alembic + 0001 initial migration (raw SQL)

- alembic.ini wires script_location=migrations and a placeholder URL
  that env.py overrides from app.config.settings.db_url.
- migrations/env.py: target_metadata=None (no SQLAlchemy ORM); pulls
  db_url from pydantic-settings; supports offline + online modes.
- migrations/versions/0001_initial.py: full DDL via op.execute(...)
  blocks. upgrade() creates 13 tables + 6 indexes + pgcrypto.
  downgrade() drops in reverse-dependency order.
- Mirrors schema.sql exactly. First-time devs can use either.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `app/config.py` — pydantic-settings (TDD)

**Files:**
- Create: `backend/app/config.py`
- Create: `backend/tests/test_config.py`

- [ ] **Step 1: Create `backend/.env.local` with real values for testing**

```bash
cd backend
cp .env.example .env.local
# Edit .env.local — set DB_PASSWORD to whatever your local Postgres uses
# (defaults to "postgres" if you didn't override it in docker-compose).
```

- [ ] **Step 2: Write failing test at `backend/tests/test_config.py`**

```python
"""Tests for app.config Settings."""

import os

import pytest

from app.config import Settings


def test_settings_loads_required_fields(monkeypatch: pytest.MonkeyPatch) -> None:
    """Settings reads DB_*, JWT_SECRET, ALLOWED_ORIGINS from env."""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "projecthub")
    monkeypatch.setenv("DB_USER", "postgres")
    monkeypatch.setenv("DB_PASSWORD", "secret")
    monkeypatch.setenv("JWT_SECRET", "x" * 32)
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:5173")

    s = Settings()

    assert s.db_host == "localhost"
    assert s.db_port == 5432
    assert s.db_name == "projecthub"
    assert s.db_user == "postgres"
    assert s.db_password == "secret"
    assert s.jwt_secret == "x" * 32
    assert s.allowed_origins == ["http://localhost:3000", "http://localhost:5173"]


def test_db_url_is_constructed(monkeypatch: pytest.MonkeyPatch) -> None:
    """db_url property assembles a postgresql:// connection string."""
    monkeypatch.setenv("DB_HOST", "localhost")
    monkeypatch.setenv("DB_PORT", "5432")
    monkeypatch.setenv("DB_NAME", "projecthub")
    monkeypatch.setenv("DB_USER", "postgres")
    monkeypatch.setenv("DB_PASSWORD", "secret")
    monkeypatch.setenv("JWT_SECRET", "x" * 32)
    monkeypatch.setenv("ALLOWED_ORIGINS", "http://localhost:3000")

    s = Settings()
    assert s.db_url == "postgresql://postgres:secret@localhost:5432/projecthub"


def test_missing_required_field_raises(monkeypatch: pytest.MonkeyPatch) -> None:
    """Settings raises ValidationError when a required field is absent."""
    # Clear all relevant env vars
    for k in ("DB_HOST", "DB_PORT", "DB_NAME", "DB_USER", "DB_PASSWORD", "JWT_SECRET", "ALLOWED_ORIGINS"):
        monkeypatch.delenv(k, raising=False)
    # Ensure no .env files leak in
    monkeypatch.setenv("PYDANTIC_SETTINGS_DISABLE_ENV_FILE", "1")

    with pytest.raises(Exception):  # ValidationError from pydantic
        Settings(_env_file=None)
```

- [ ] **Step 3: Run test to verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_config.py -v
```

Expected: FAIL with `ModuleNotFoundError: No module named 'app.config'` (or `ImportError`).

- [ ] **Step 4: Create `backend/app/config.py`**

```python
"""Application settings — loaded from env via pydantic-settings."""

from typing import List

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Single-source-of-truth for runtime configuration.

    Reads from process environment variables. In dev, .env.local is
    loaded automatically (gitignored). Required fields raise on boot
    if missing — fail fast.
    """

    model_config = SettingsConfigDict(
        env_file=".env.local",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # Database
    db_host: str = Field(..., alias="DB_HOST")
    db_port: int = Field(..., alias="DB_PORT")
    db_name: str = Field(..., alias="DB_NAME")
    db_user: str = Field(..., alias="DB_USER")
    db_password: str = Field(..., alias="DB_PASSWORD")

    # Auth (used in Phase 2)
    jwt_secret: str = Field(..., alias="JWT_SECRET", min_length=32)

    # CORS
    allowed_origins: List[str] = Field(..., alias="ALLOWED_ORIGINS")

    # AI (used in Phase 6) — optional in Phase 1
    gemini_api_key: str = Field("", alias="GEMINI_API_KEY")

    @field_validator("allowed_origins", mode="before")
    @classmethod
    def _split_origins(cls, v: object) -> object:
        """Accept comma-separated string from env, return list."""
        if isinstance(v, str):
            return [o.strip() for o in v.split(",") if o.strip()]
        return v

    @property
    def db_url(self) -> str:
        """SQLAlchemy / psycopg-style connection URL."""
        return (
            f"postgresql://{self.db_user}:{self.db_password}"
            f"@{self.db_host}:{self.db_port}/{self.db_name}"
        )


settings = Settings()  # type: ignore[call-arg]
```

The `# type: ignore[call-arg]` is needed because Pydantic's `BaseSettings` populates fields from env at runtime; mypy doesn't know that.

- [ ] **Step 5: Run test to verify pass**

```bash
pytest tests/test_config.py -v
```

Expected: 3 tests pass.

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/app/config.py backend/tests/test_config.py
git commit -m "$(cat <<'EOF'
feat(backend): app.config — pydantic-settings with required env fields

Settings(BaseSettings) reads:
- DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (required)
- JWT_SECRET (required, min 32 chars — used in Phase 2)
- ALLOWED_ORIGINS (required, comma-separated → List[str])
- GEMINI_API_KEY (optional in Phase 1, required in Phase 6)

Loads .env.local in dev (gitignored). db_url property assembles
postgresql:// URL. Fail-fast on missing fields at boot.

Tests: 3 unit tests cover happy path, db_url construction, and
missing-field validation error.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

- [ ] **Step 7: NOW return to Task 5 Step 5–7 — apply the Alembic migration**

Go back and complete the deferred steps from Task 5 (apply the migration with Alembic now that `app.config.settings` exists, then commit the Alembic files).

---

### Task 7: `app/responses.py` — `ok()` / `fail()` helpers (TDD)

**Files:**
- Create: `backend/app/responses.py`
- Create: `backend/tests/test_responses.py`

- [ ] **Step 1: Write failing test**

```python
"""Tests for app.responses envelope helpers."""

from app.responses import ok, fail


def test_ok_default_message() -> None:
    result = ok()
    assert result == {"status": "success", "message": "OK", "data": None}


def test_ok_with_data() -> None:
    result = ok(data={"id": "abc", "name": "Bob"})
    assert result == {"status": "success", "message": "OK", "data": {"id": "abc", "name": "Bob"}}


def test_ok_with_custom_message_and_data() -> None:
    result = ok(data=[1, 2, 3], message="Created")
    assert result == {"status": "success", "message": "Created", "data": [1, 2, 3]}


def test_fail_default_message() -> None:
    result = fail()
    assert result == {"status": "failure", "message": "Error", "data": None}


def test_fail_with_message() -> None:
    result = fail(message="Project not found")
    assert result == {"status": "failure", "message": "Project not found", "data": None}


def test_fail_with_data() -> None:
    """Failures may include error details in data."""
    result = fail(message="Validation failed", data={"field": "email", "issue": "invalid format"})
    assert result == {
        "status": "failure",
        "message": "Validation failed",
        "data": {"field": "email", "issue": "invalid format"},
    }
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_responses.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.responses'`.

- [ ] **Step 3: Create `backend/app/responses.py`**

```python
"""Response envelope helpers — enforce the {status, message, data} shape."""

from typing import Any


def ok(*, data: Any = None, message: str = "OK") -> dict[str, Any]:
    """Successful response envelope."""
    return {"status": "success", "message": message, "data": data}


def fail(*, message: str = "Error", data: Any = None) -> dict[str, Any]:
    """Failure response envelope. data may carry validation details."""
    return {"status": "failure", "message": message, "data": data}
```

- [ ] **Step 4: Run, verify pass**

```bash
pytest tests/test_responses.py -v
```

Expected: 6 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/responses.py backend/tests/test_responses.py
git commit -m "$(cat <<'EOF'
feat(backend): app.responses — ok()/fail() envelope helpers

Per the spec's {status, message, data} convention:
- ok(data=..., message="OK") for successes
- fail(message="Error", data=...) for failures (data may carry
  validation details)

Both keyword-only args. Default messages keep call sites tight.

6 unit tests cover defaults, data passing, custom messages, and the
failure-with-data case.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: `app/exceptions.py` — `AppError` + global handler (TDD)

**Files:**
- Create: `backend/app/exceptions.py`
- Create: `backend/tests/test_exceptions.py`

- [ ] **Step 1: Write failing test**

```python
"""Tests for app.exceptions — AppError + global handler."""

import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.exceptions import AppError, register_exception_handlers


def _build_app() -> FastAPI:
    """Throwaway FastAPI app for handler tests."""
    app = FastAPI()
    register_exception_handlers(app)

    @app.get("/raise-app-error")
    def _raise_app_error() -> None:
        raise AppError("Custom failure", status_code=400, data={"field": "email"})

    @app.get("/raise-http-error")
    def _raise_http_error() -> None:
        raise HTTPException(status_code=404, detail="Not found")

    @app.get("/raise-unhandled")
    def _raise_unhandled() -> None:
        raise RuntimeError("boom")

    return app


def test_app_error_returns_envelope() -> None:
    """AppError is serialized to {status: failure, message, data} with the requested status code."""
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/raise-app-error")
    assert response.status_code == 400
    assert response.json() == {
        "status": "failure",
        "message": "Custom failure",
        "data": {"field": "email"},
    }


def test_http_exception_returns_envelope() -> None:
    """FastAPI HTTPException is wrapped in the failure envelope (not the default {detail: ...})."""
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/raise-http-error")
    assert response.status_code == 404
    assert response.json() == {
        "status": "failure",
        "message": "Not found",
        "data": None,
    }


def test_unhandled_exception_returns_500_envelope() -> None:
    """Unhandled exceptions → 500 with a generic safe message (no leakage of internal details)."""
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/raise-unhandled")
    assert response.status_code == 500
    body = response.json()
    assert body["status"] == "failure"
    assert body["message"] == "Internal server error"
    assert body["data"] is None


def test_app_error_default_status() -> None:
    """AppError with no status_code defaults to 400."""
    err = AppError("oops")
    assert err.status_code == 400
    assert err.message == "oops"
    assert err.data is None
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_exceptions.py -v
```

Expected: `ImportError`.

- [ ] **Step 3: Create `backend/app/exceptions.py`**

```python
"""Application-level exceptions and FastAPI exception handlers.

All errors flow through one of three handlers and produce the
{status, message, data} envelope. Unhandled exceptions are caught
by the catchall handler and return a generic 500 (no internal-detail
leakage to clients).
"""

from typing import Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse

from app.responses import fail


class AppError(Exception):
    """Domain-level error raised by route functions.

    Carries the HTTP status code and optional data payload directly.
    Use this instead of raising HTTPException when you want to attach
    structured data to the failure response.
    """

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 400,
        data: Any = None,
    ) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code
        self.data = data


def register_exception_handlers(app: FastAPI) -> None:
    """Wire the three exception handlers onto a FastAPI instance."""

    @app.exception_handler(AppError)
    async def _handle_app_error(_request: Request, exc: AppError) -> JSONResponse:
        return JSONResponse(
            status_code=exc.status_code,
            content=fail(message=exc.message, data=exc.data),
        )

    @app.exception_handler(HTTPException)
    async def _handle_http_exception(_request: Request, exc: HTTPException) -> JSONResponse:
        # exc.detail can be str or dict; coerce to string for the envelope's message
        message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)
        return JSONResponse(
            status_code=exc.status_code,
            content=fail(message=message),
        )

    @app.exception_handler(Exception)
    async def _handle_unhandled(_request: Request, _exc: Exception) -> JSONResponse:
        return JSONResponse(
            status_code=500,
            content=fail(message="Internal server error"),
        )
```

- [ ] **Step 4: Run, verify pass**

```bash
pytest tests/test_exceptions.py -v
```

Expected: 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/app/exceptions.py backend/tests/test_exceptions.py
git commit -m "$(cat <<'EOF'
feat(backend): app.exceptions — AppError + global handlers

- AppError(message, status_code=400, data=None) for domain failures
  with structured details.
- register_exception_handlers(app) wires three handlers:
  * AppError → custom envelope at requested status code
  * HTTPException → wrap detail in failure envelope
  * Exception (catchall) → 500 with generic "Internal server error"
    message (no internal-detail leakage)

4 unit tests using FastAPI TestClient cover all three handlers and
the AppError default-status case.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: `app/db.py` — psycopg connection pool (TDD)

**Files:**
- Create: `backend/app/db.py`
- Create: `backend/tests/test_db.py`

This task assumes the local Postgres is running (Task 3) and the schema has been applied (Task 5 Step 6).

- [ ] **Step 1: Write failing test**

```python
"""Tests for app.db connection pool and helpers."""

import pytest

from app.db import close_pool, get_conn, init_pool


@pytest.fixture(scope="module", autouse=True)
def _pool_lifecycle():
    """Open the pool once for this test module, close at the end."""
    init_pool()
    yield
    close_pool()


def test_get_conn_yields_a_connection() -> None:
    """get_conn() context manager yields a working psycopg connection."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS one")
            row = cur.fetchone()
            assert row is not None
            assert row["one"] == 1   # dict_row factory — use named access throughout


def test_get_conn_returns_dict_rows() -> None:
    """Cursors return rows as dicts when row_factory is configured."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 'alpha' AS name, 42 AS num")
            row = cur.fetchone()
            assert row is not None
            assert row["name"] == "alpha"
            assert row["num"] == 42


def test_get_conn_can_query_users_table() -> None:
    """Connecting to projecthub DB and selecting from the users table works (proves schema applied)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users")
            row = cur.fetchone()
            assert row is not None
            assert row["c"] >= 0  # no users yet, but query should succeed
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_db.py -v
```

Expected: `ImportError: cannot import name 'init_pool' from 'app.db'`.

- [ ] **Step 3: Create `backend/app/db.py`**

```python
"""Postgres connection pool + per-request connection helper."""

from contextlib import contextmanager
from typing import Iterator

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings

_pool: ConnectionPool | None = None


def init_pool() -> None:
    """Open the global connection pool. Idempotent."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=settings.db_url,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
            open=True,
        )
        _pool.wait()


def close_pool() -> None:
    """Close the global pool. Idempotent."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def get_conn() -> Iterator[Connection]:
    """Check out a connection from the pool for the duration of the context.

    Usage:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT ...")
                rows = cur.fetchall()
    """
    if _pool is None:
        raise RuntimeError("Connection pool not initialized — call init_pool() at app startup")
    with _pool.connection() as conn:
        yield conn
```

- [ ] **Step 4: Run, verify pass**

```bash
pytest tests/test_db.py -v
```

Expected: 3 tests pass. If you see "Connection refused", make sure Postgres is up (`docker compose ps postgres`). If you see "relation 'users' does not exist", run `alembic upgrade head` (Task 5 Step 6).

- [ ] **Step 5: Commit**

```bash
git add backend/app/db.py backend/tests/test_db.py
git commit -m "$(cat <<'EOF'
feat(backend): app.db — psycopg connection pool + get_conn helper

- init_pool() / close_pool() — idempotent global ConnectionPool
  (psycopg v3 + psycopg_pool). min=1, max=10.
- get_conn() context manager checks out one connection per request,
  returns it to the pool on exit.
- Connections use dict_row factory so cursor.fetchone() yields a dict
  keyed by column name (works well with response shaping).

3 integration tests connect to the local Postgres, run trivial SELECTs,
and verify the users table exists (smoke test for schema).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: `tests/conftest.py` — shared fixtures

**Files:**
- Create: `backend/tests/conftest.py`

- [ ] **Step 1: Create `backend/tests/conftest.py`**

```python
"""Shared pytest fixtures for backend tests.

- `client` provides a FastAPI TestClient with the full app + lifespan.
- `db_clean` truncates all tables between tests that need a clean DB.

These fixtures connect to the dev Postgres (`projecthub` DB) on the
assumption that Task 5's migration has already been applied. Tests that
mutate data should use `db_clean` to reset state.
"""

import pytest
from fastapi.testclient import TestClient

from app.db import close_pool, get_conn, init_pool
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _pool_lifecycle():
    """Open the connection pool once per test session."""
    init_pool()
    yield
    close_pool()


@pytest.fixture
def client():
    """FastAPI TestClient for the full application.

    Uses context-manager form so the FastAPI lifespan runs (init_pool /
    close_pool). Plain `return TestClient(app)` skips lifespan and can
    leave the pool in an uninitialized state when other tests have
    already closed it.
    """
    with TestClient(app) as c:
        yield c


# Reverse-dependency order so foreign keys don't block truncation
_TABLES_TO_CLEAN = [
    "capture_item_assignees",
    "capture_items",
    "capture_sessions",
    "deadline_extensions",
    "leave_requests",
    "checkpoints",
    "feedback",
    "submissions",
    "tasks",
    "phases",
    "project_assignees",
    "projects",
    "users",
]


@pytest.fixture
def db_clean() -> None:
    """Truncate all data tables. Use on tests that mutate state."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"TRUNCATE {', '.join(_TABLES_TO_CLEAN)} RESTART IDENTITY CASCADE;")
        conn.commit()
```

This conftest depends on `app.main:app` existing — Task 12. **Skip the verify step until Task 12 lands.** This task's commit happens at the end of Task 12 with the rest of the FastAPI integration.

---

### Task 11: `app/routers/health.py` — `GET /healthz` (TDD)

**Files:**
- Create: `backend/app/routers/health.py`
- Create: `backend/tests/test_health.py`

- [ ] **Step 1: Write failing test**

```python
"""Tests for GET /healthz."""

from fastapi.testclient import TestClient


def test_healthz_returns_200(client: TestClient) -> None:
    """Default GET /healthz returns 200 with success envelope."""
    response = client.get("/healthz")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["data"] == {"ok": True}


def test_healthz_deep_pings_db(client: TestClient) -> None:
    """GET /healthz?deep=1 includes db: 'ok' in data when DB is reachable."""
    response = client.get("/healthz?deep=1")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["data"] == {"ok": True, "db": "ok"}
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_health.py -v
```

Expected: `ImportError` or `404` (depending on whether `app.main:app` exists yet — at this point in the plan it doesn't, so import fails).

- [ ] **Step 3: Create `backend/app/routers/health.py`**

```python
"""Health check router — liveness + optional DB-deep probe."""

from fastapi import APIRouter

from app.db import get_conn
from app.responses import ok

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz(deep: int = 0) -> dict:
    """Return 200 with `{ok: true}`. With ?deep=1, also pings the DB."""
    data: dict = {"ok": True}
    if deep:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT 1 AS one")
            row = cur.fetchone()
            assert row is not None and row["one"] == 1
        data["db"] = "ok"
    return ok(data=data)
```

(The `?deep=1` failure mode — i.e. Postgres unreachable — bubbles up to the global exception handler, which returns 500 with `{status: failure, message: "Internal server error"}`. We're not testing that path here because it requires killing Postgres mid-suite.)

- [ ] **Step 4: Run, verify pass**

This step depends on Task 12 (`app/main.py`) existing. Defer the verify run to Task 12 Step 4.

- [ ] **Step 5: Commit happens at end of Task 12.**

---

### Task 12: `app/main.py` — FastAPI app + integration test

**Files:**
- Create: `backend/app/main.py`

- [ ] **Step 1: Create `backend/app/main.py`**

```python
"""FastAPI application factory.

- Wires CORSMiddleware from settings.allowed_origins.
- Registers exception handlers (envelope-shaped failure responses).
- Includes the health router (Phase 1).
- Manages the connection pool lifecycle via FastAPI lifespan.

Future phases: include auth, users, projects, ... routers.
"""

from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db import close_pool, init_pool
from app.exceptions import register_exception_handlers
from app.routers import health


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    """Open the DB pool on startup, close on shutdown."""
    init_pool()
    try:
        yield
    finally:
        close_pool()


app = FastAPI(
    title="ProjectHub API",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

register_exception_handlers(app)

app.include_router(health.router)
```

- [ ] **Step 2: Run the full test suite**

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected: all tests from prior tasks pass — `test_config` (3), `test_responses` (6), `test_exceptions` (4), `test_db` (3), `test_health` (2). Total: 18 tests passing.

If `test_health` fails because the `client` fixture conflicts with the per-module pool fixture in `test_db.py`, the cleanup is to use `pytest -p no:cacheprovider` and verify both files use the session-scoped pool from conftest. The conftest's `_pool_lifecycle` is `scope="session"` and `autouse=True`, so it should win.

- [ ] **Step 3: Smoke-test the live server**

In one terminal:

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
curl http://localhost:8000/healthz
curl 'http://localhost:8000/healthz?deep=1'
```

Expected:
- First curl: `{"status":"success","message":"OK","data":{"ok":true}}`
- Second curl: `{"status":"success","message":"OK","data":{"ok":true,"db":"ok"}}`

Stop uvicorn (Ctrl+C).

- [ ] **Step 4: Commit (this commit covers Tasks 10, 11, and 12)**

```bash
cd ..
git add backend/app/main.py backend/app/routers/health.py backend/tests/test_health.py backend/tests/conftest.py
git commit -m "$(cat <<'EOF'
feat(backend): FastAPI app + healthz router + shared test fixtures

- app.main creates the FastAPI instance, attaches CORSMiddleware
  (origins from settings.allowed_origins), registers the global
  exception handlers, and manages the DB pool via lifespan.
- app.routers.health.router exposes GET /healthz: returns
  {ok: true}; with ?deep=1 also pings the DB and reports {db: "ok"}.
- tests/conftest.py provides:
  * session-scoped pool lifecycle fixture
  * `client` fixture (FastAPI TestClient bound to app)
  * `db_clean` fixture that TRUNCATEs all tables in
    reverse-dependency order

2 healthz tests pass (default + deep). Total suite: 18 tests across
5 files.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 13: `scripts/seed.py` — idempotent seeder

**Files:**
- Create: `backend/scripts/seed.py`
- Create: `backend/tests/test_seed.py`

- [ ] **Step 1: Write failing test**

```python
"""Tests for scripts.seed — idempotent seed script."""

import pytest

from app.db import get_conn
from scripts.seed import seed


def test_seed_creates_users_and_projects(db_clean: None) -> None:
    """Seed populates users + projects when DB is empty."""
    seed()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users")
            user_count = cur.fetchone()["c"]
            cur.execute("SELECT count(*) AS c FROM projects")
            project_count = cur.fetchone()["c"]

    assert user_count == 5  # 1 ceo + 4 team members
    assert project_count == 2


def test_seed_is_idempotent(db_clean: None) -> None:
    """Running seed twice produces the same row counts (no duplicates)."""
    seed()
    seed()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users")
            user_count = cur.fetchone()["c"]
            cur.execute("SELECT count(*) AS c FROM projects")
            project_count = cur.fetchone()["c"]

    assert user_count == 5
    assert project_count == 2


def test_seed_creates_a_ceo(db_clean: None) -> None:
    """At least one seeded user has role_type='ceo'."""
    seed()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users WHERE role_type = 'ceo'")
            ceo_count = cur.fetchone()["c"]

    assert ceo_count == 1
```

- [ ] **Step 2: Run, verify fail**

```bash
pytest tests/test_seed.py -v
```

Expected: `ModuleNotFoundError: No module named 'scripts'`.

- [ ] **Step 3: Create `backend/scripts/__init__.py`**

```bash
touch backend/scripts/__init__.py
```

- [ ] **Step 4: Create `backend/scripts/seed.py`**

```python
"""Idempotent dev-data seeder.

Creates a CEO + four team members + two sample projects with phases,
tasks, and assignees. Skips entities that already exist (matched by
email for users, by title for projects).

Usage:
    python -m scripts.seed
"""

from app.db import get_conn

# Static seed data — keep in sync with frontend's prisma/seed.ts as
# long as both worlds run side-by-side (Phases 2-6).

_USERS = [
    {
        "name": "Sundar Iyer",
        "email": "ceo@projecthub.dev",
        "role": "Chief Executive Officer",
        "role_type": "ceo",
        "avatar_color": "#4F46E5",
        "password_hash": "$2b$12$placeholderhashreplacedinphase2",  # bcrypt placeholder; Phase 2 sets a real hash
    },
    {
        "name": "Arjun Mehta",
        "email": "arjun@projecthub.dev",
        "role": "Senior Engineer",
        "role_type": "team_member",
        "avatar_color": "#14B8A6",
        "password_hash": "$2b$12$placeholderhashreplacedinphase2",
    },
    {
        "name": "Priya Sharma",
        "email": "priya@projecthub.dev",
        "role": "Product Designer",
        "role_type": "team_member",
        "avatar_color": "#F472B6",
        "password_hash": "$2b$12$placeholderhashreplacedinphase2",
    },
    {
        "name": "Vikram Rao",
        "email": "vikram@projecthub.dev",
        "role": "Data Scientist",
        "role_type": "team_member",
        "avatar_color": "#A855F7",
        "password_hash": "$2b$12$placeholderhashreplacedinphase2",
    },
    {
        "name": "Lakshmi Nair",
        "email": "lakshmi@projecthub.dev",
        "role": "Engineering Manager",
        "role_type": "team_member",
        "avatar_color": "#F59E0B",
        "password_hash": "$2b$12$placeholderhashreplacedinphase2",
    },
]

_PROJECTS = [
    {
        "title": "API Gateway Modernization",
        "type": "engineering",
        "requirement": "Replace legacy nginx + custom auth with API Gateway + JWT.",
        "status": "active",
        "priority": "high",
        "current_phase": "Implementation",
        "timebox_days": 60,
    },
    {
        "title": "Customer Churn Prediction Model",
        "type": "research",
        "requirement": "Build a churn-risk classifier from the past 12mo of usage data.",
        "status": "active",
        "priority": "medium",
        "current_phase": "Hypothesis",
        "timebox_days": 90,
    },
]


def seed() -> None:
    """Run the seed. Idempotent — safe to invoke multiple times."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Users — INSERT ... ON CONFLICT DO NOTHING by email
            for u in _USERS:
                cur.execute(
                    """
                    INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                    VALUES (%(name)s, %(email)s, %(role)s, %(role_type)s, %(avatar_color)s, %(password_hash)s)
                    ON CONFLICT (email) DO NOTHING
                    """,
                    u,
                )

            # Look up the CEO id for project ownership
            cur.execute("SELECT id FROM users WHERE email = 'ceo@projecthub.dev'")
            ceo_row = cur.fetchone()
            ceo_id = ceo_row["id"] if ceo_row else None

            # Projects — INSERT only if title doesn't already exist
            for p in _PROJECTS:
                cur.execute(
                    "SELECT id FROM projects WHERE title = %s",
                    (p["title"],),
                )
                if cur.fetchone() is not None:
                    continue
                cur.execute(
                    """
                    INSERT INTO projects (title, type, requirement, status, priority, current_phase, timebox_days, created_by)
                    VALUES (%(title)s, %(type)s, %(requirement)s, %(status)s, %(priority)s, %(current_phase)s, %(timebox_days)s, %(created_by)s)
                    """,
                    {**p, "created_by": ceo_id},
                )

        conn.commit()


if __name__ == "__main__":
    seed()
    print("Seed complete.")
```

- [ ] **Step 5: Run, verify pass**

```bash
pytest tests/test_seed.py -v
```

Expected: 3 tests pass.

- [ ] **Step 6: Run the seeder against the dev DB to populate it**

```bash
cd backend
source .venv/Scripts/activate
python -m scripts.seed
```

Expected output: `Seed complete.` Verify:

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub') as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT email, role_type FROM users ORDER BY email')
        for row in cur.fetchall():
            print(row)
"
```

Expected: 5 users listed (1 ceo + 4 team_members).

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend/scripts/__init__.py backend/scripts/seed.py backend/tests/test_seed.py
git commit -m "$(cat <<'EOF'
feat(backend): scripts/seed.py — idempotent dev seeder

Populates the dev DB with:
- 1 CEO (ceo@projecthub.dev)
- 4 team members (engineer, designer, data scientist, eng manager)
- 2 sample projects (engineering + research)

Idempotency:
- Users: INSERT ... ON CONFLICT (email) DO NOTHING
- Projects: pre-check by title, INSERT only when absent

Password hashes are placeholders to be overwritten in Phase 2 once
bcrypt is wired in. Seed data matches frontend/prisma/seed.ts in
spirit so the same emails work across both stacks during the
parallel-run period.

Run with: python -m scripts.seed

3 tests cover: populates correctly on empty DB, idempotent on rerun,
exactly one ceo created.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 14: Schema introspection test

**Files:**
- Create: `backend/tests/test_schema.py`

A safety net: assert that the migration produced the table set the spec expects. Catches drift if someone hand-edits schema.sql without updating the migration (or vice versa).

- [ ] **Step 1: Write the test**

```python
"""Verify the migrated schema matches the spec.

Runs against the live Postgres after `alembic upgrade head`.
"""

from app.db import get_conn


_EXPECTED_TABLES = {
    "users",
    "projects",
    "project_assignees",
    "phases",
    "tasks",
    "submissions",
    "feedback",
    "checkpoints",
    "leave_requests",
    "deadline_extensions",
    "capture_sessions",
    "capture_items",
    "capture_item_assignees",
}


def test_all_expected_tables_exist() -> None:
    """All 13 user-data tables from the spec exist in public schema."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name != 'alembic_version'
                """
            )
            actual = {row["table_name"] for row in cur.fetchall()}
    missing = _EXPECTED_TABLES - actual
    extra = actual - _EXPECTED_TABLES
    assert not missing, f"Missing tables: {missing}"
    assert not extra, f"Unexpected tables: {extra}"


def test_users_has_unique_email() -> None:
    """users.email has a UNIQUE constraint (per spec)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT count(*) AS c
                FROM information_schema.table_constraints
                WHERE table_name = 'users'
                  AND constraint_type = 'UNIQUE'
                """
            )
            row = cur.fetchone()
    assert row is not None and row["c"] >= 1


def test_pgcrypto_extension_enabled() -> None:
    """pgcrypto must be installed for gen_random_uuid()."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'")
            row = cur.fetchone()
    assert row is not None
    assert row["extname"] == "pgcrypto"


def test_indexes_exist() -> None:
    """Six indexes from the spec exist."""
    expected = {
        "idx_projects_status_created",
        "idx_tasks_assignee_status",
        "idx_tasks_project_phase",
        "idx_submissions_project_created",
        "idx_leave_requests_user_status",
        "idx_capture_sessions_user_created",
    }
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
                """
            )
            actual = {row["indexname"] for row in cur.fetchall()}
    missing = expected - actual
    assert not missing, f"Missing indexes: {missing}"
```

- [ ] **Step 2: Run, verify pass (no implementation needed — this is pure introspection)**

```bash
pytest tests/test_schema.py -v
```

Expected: 4 tests pass.

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_schema.py
git commit -m "$(cat <<'EOF'
test(backend): schema introspection guards drift

4 tests query information_schema and pg_indexes to confirm:
- All 13 user-data tables from the spec exist
- users.email has a UNIQUE constraint
- pgcrypto extension is installed
- All 6 named indexes are present

These run against the live Postgres after `alembic upgrade head` and
catch silent divergence between schema.sql and the migration.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 15: `Dockerfile` — production image

**Files:**
- Create: `backend/Dockerfile`
- Create: `backend/.dockerignore`

- [ ] **Step 1: Create `backend/Dockerfile`**

```dockerfile
# Production image — gunicorn + uvicorn workers.
# Local dev uses `uvicorn --reload` directly, not this image.

FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

WORKDIR /app

# Install build deps for psycopg (binary wheel covers most cases but keep gcc as a fallback)
RUN apt-get update && apt-get install -y --no-install-recommends \
        gcc \
        libpq-dev \
        && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml ./
RUN pip install --upgrade pip && pip install -e ".[prod]"

COPY app ./app
COPY migrations ./migrations
COPY alembic.ini ./
COPY schema.sql ./

EXPOSE 8000

# Workers = 2 * vCPUs + 1 — tune at deploy time via $WEB_CONCURRENCY
ENV WEB_CONCURRENCY=2
CMD ["sh", "-c", "alembic upgrade head && gunicorn -k uvicorn.workers.UvicornWorker -w ${WEB_CONCURRENCY} -b 0.0.0.0:8000 app.main:app"]
```

- [ ] **Step 2: Create `backend/.dockerignore`**

```
__pycache__/
*.py[cod]
*$py.class
.venv/
venv/
.pytest_cache/
.mypy_cache/
.ruff_cache/
*.egg-info/
.env
.env.*
!.env.example
tests/
scripts/
docker-compose.yml
README.md
```

Tests, scripts, and docker-compose don't need to be in the production image.

- [ ] **Step 3: Verify the image builds**

```bash
cd backend
docker build -t projecthub-backend:dev .
```

Expected: image builds successfully. The build will take 1-3 minutes the first time (apt-get + pip install).

- [ ] **Step 4: Verify the image starts (without DB; just confirm Python imports work)**

```bash
docker run --rm projecthub-backend:dev python -c "from app.main import app; print(app.title)"
```

Expected: `ProjectHub API` (or similar — exits cleanly).

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/Dockerfile backend/.dockerignore
git commit -m "$(cat <<'EOF'
feat(backend): production Dockerfile

- python:3.12-slim base
- libpq-dev + gcc for psycopg fallback (binary wheel covers most archs)
- pip install -e ".[prod]" — pulls in gunicorn alongside runtime deps
- CMD runs `alembic upgrade head` first, then gunicorn with
  uvicorn.workers.UvicornWorker. WEB_CONCURRENCY=2 default; override
  at deploy time.
- .dockerignore excludes tests, scripts, .venv, caches, .env.local

Local dev still uses `uvicorn --reload` directly (no Docker round-trip).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 16: `backend/README.md` + cleanup `.gitkeep` + final smoke + push

**Files:**
- Create: `backend/README.md`
- Delete: `backend/.gitkeep`

- [ ] **Step 1: Create `backend/README.md`**

````markdown
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
````

- [ ] **Step 2: Delete the placeholder `.gitkeep`**

```bash
git rm backend/.gitkeep
```

- [ ] **Step 3: Run the full test suite one more time**

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected: all tests pass. Final count:
- `test_config.py`: 3
- `test_responses.py`: 6
- `test_exceptions.py`: 4
- `test_db.py`: 3
- `test_health.py`: 2
- `test_seed.py`: 3
- `test_schema.py`: 4

**Total: 25 tests across 7 files.**

- [ ] **Step 4: Smoke test the running server with seed data loaded**

In one terminal:

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload --port 8000
```

In another terminal:

```bash
curl -s http://localhost:8000/healthz | python -m json.tool
curl -s 'http://localhost:8000/healthz?deep=1' | python -m json.tool
curl -s http://localhost:8000/docs -o /dev/null -w "%{http_code}\n"
```

Expected:
- `/healthz` returns `{"status": "success", "message": "OK", "data": {"ok": true}}`
- `/healthz?deep=1` returns the above plus `"db": "ok"`
- `/docs` returns `200` (Swagger UI live)

Stop uvicorn (Ctrl+C).

- [ ] **Step 5: Commit + push**

```bash
cd ..
git add backend/README.md
git commit -m "$(cat <<'EOF'
docs(backend): README + remove .gitkeep placeholder

backend/README.md covers:
- Quickstart (compose, venv, alembic, seed, uvicorn)
- Test invocation
- Migrations workflow (upgrade, downgrade, new revision)
- Production image build + run
- Project layout (app/, scripts/, tests/)
- Stack and conventions (links to fastapi-backend-stack.md)

backend/.gitkeep removed — real files now exist.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git push -u origin feature/backend-phase-1-bootstrap
```

Expected: branch pushed; PR URL printed.

---

## Acceptance criteria

After all tasks complete:

1. Branch `feature/backend-phase-1-bootstrap` exists with ~12-14 commits, all pushed to origin.
2. The user's local Postgres is running and `projecthub` + `projecthub_test` databases exist; connection from `psycopg` succeeds with `.env.local` credentials.
3. `cd backend && alembic upgrade head` succeeds; introspection via psycopg shows 13 user tables + `alembic_version`.
4. `cd backend && python -m scripts.seed` populates 5 users + 2 projects; rerunning is a no-op.
5. `cd backend && pytest -v` runs **25 tests across 7 files**, all green.
6. `cd backend && uvicorn app.main:app --reload --port 8000` boots without errors. `curl http://localhost:8000/healthz` returns `{"status":"success","message":"OK","data":{"ok":true}}`. `?deep=1` adds `"db":"ok"`. `http://localhost:8000/docs` shows Swagger UI.
7. `cd backend && docker build -t projecthub-backend:dev .` builds successfully.
8. `frontend/` is **untouched** — `cd frontend && npm test` still produces 138 tests across 25 files (the Phase 0 baseline).
9. `git log --oneline backend/` (from repo root) shows clean commits with descriptive `feat(backend):` / `test(backend):` / `docs(backend):` scopes.
10. `docs/migration-mapping.md` row for `GET /healthz` is updated from ⏳ to ✅ (or 🚧 if you want to defer the marker until the frontend wires it up — but no frontend work in this phase, so ✅ is correct).

## Out of scope (deferred to later phases)

- `app/auth.py`, `app/routers/auth.py`, JWT issue/decode/refresh — Phase 2.
- All other domain routers (users, projects, tasks, etc.) — Phases 3–6.
- Frontend integration with the FastAPI server — Phases 2–6.
- Pre-commit hooks (ruff/mypy on commit) — could add via `husky` or `pre-commit` later; not blocking.
- Database migration rollback testing in CI — not blocking for v1.
- Production deployment (AWS, Render, Fly.io) — Phase 8, deferred per spec.
- Background workers / queues — out of scope entirely (see spec out-of-scope).
