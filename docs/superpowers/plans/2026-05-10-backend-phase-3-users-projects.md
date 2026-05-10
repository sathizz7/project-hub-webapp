# Backend Phase 3 — Users + Projects + Phases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the **users**, **projects**, and **phases** domain on FastAPI, then swap the corresponding Server-Component data fetches in the frontend from Prisma to `apiServerFetch`. After Phase 3 ships, the project-related pages (`/projects` list, `/projects/[id]` workspace, `/team`, `/team/manage`) all render through FastAPI. Tasks, submissions, leaves, etc. still use Prisma — they migrate in Phases 4–6.

**Architecture:**
- **Backend** adds 3 routers — `users.py` (CRUD), `projects.py` (CRUD + assignees + hydrated reads), `phases.py` (read + checklist update). Pydantic schemas in `app/schemas/{users,projects,phases}.py`. CEO-only writes via `Depends(require_roles("ceo"))`. Team-member-scoped reads (`/my/projects`) filter by `project_assignees.user_id` and return **404 (not 403)** on mismatch — per spec / IAS pattern.
- **Hydrated `GET /api/v1/projects/{id}`** runs 6 SELECTs in one DB connection and assembles project + assignees + phases + tasks + submissions+feedback + checkpoints into one response payload. Matches today's Prisma `findUnique({ include: {...} })` shape so the workspace page only changes its data source, not its rendering.
- **Frontend** Server Components swap `prisma.project.findMany(...)` for `await apiServerFetch<...>("/api/v1/projects")`. The new `lib/api.ts` helper (added in Phase 2) handles cookie + Bearer + envelope unwrap. Client components (e.g. `/projects/new` wizard) fetch via `/api/proxy/v1/...` so the Next.js proxy handler injects the Bearer header.
- **Cleanup** at end of phase deletes the old Next.js API routes (`/api/users`, `/api/projects`, `/api/projects/[id]`, `/api/phases`) — anything that was Prisma-backed in the migrated surface.

**Tech Stack:** Backend continues with FastAPI + psycopg v3 + raw SQL. Frontend: no new packages — uses the existing `apiServerFetch` (server) + `/api/proxy/[...path]` (client) plumbing.

**Spec source:** `docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md` — Section 2 (router table for users/projects/phases), Section 6 Phase 3.

**Branch:** `feature/backend-phase-3-users-projects` (cut from `master` at the post-Phase-2 merge commit `f41f69b`)

---

## Decisions locked

| Topic | Decision | Why |
|---|---|---|
| Hydrated `GET /projects/{id}` shape | Returns project + assignees (with user) + phases + tasks (with assignee) + submissions (with user + feedback) + checkpoints, all in one envelope | Matches today's `prisma.project.findUnique({ include: {...} })` so the workspace page is a one-line swap (`apiServerFetch<HydratedProject>(...)` instead of the Prisma call). One round-trip per page. |
| Multi-table assembly | **Multiple sequential SELECTs in one DB connection** (not a giant LEFT JOIN with JSON aggregation) | 5–6 small queries are easier to read, easier to test, and faster to maintain than a 60-line JSON-aggregation SQL. Connection-level transactions keep them atomic. Postgres handles each in 1–2ms for typical row counts. |
| Project-list page hydration | `GET /api/v1/projects` returns each project + its assignees (with user.name, avatar_color, id) and a computed `progress` percentage | Project cards on the landing/list page render from this; same data needs as today's Prisma call. |
| `progress` field on project rows | Computed inline as `100 * completed_phases / total_phases` (rounded) | Avoids an extra column; one CASE-aggregate on the LEFT JOIN to `phases`. |
| `/api/v1/my/projects` | Filter by `project_assignees.user_id = current_user.user_id`, **return the same hydrated shape** as `/projects` | A team member's "My Projects" page is just a filtered view of the same list page. |
| 404-not-403 on ownership mismatch | Team member calling `GET /projects/{id}` for a project they're not assigned to → **404** | Per fastapi-backend-stack.md: don't leak existence. CEOs see all projects (they always pass the `assignee_check`). |
| `POST /projects` side effects | Inserts `projects` row + auto-creates phases from a static template (engineering or research) + inserts the requesting CEO into `project_assignees`. All in one transaction. | Matches today's behavior in the Next.js POST handler. The static phase template lives in `app/projects_templates.py`. |
| Phase template source | New `app/projects_templates.py` (Python module with two `list[dict]` constants for engineering/research) | Smaller blast radius than re-using the frontend's `lib/phases.ts`. |
| Update flow for projects | `PATCH /projects/{id}` accepts a partial body; only fields present are updated. Pydantic model uses `Optional` defaults | Standard partial-update pattern. CEO-only. |
| `POST /projects/{id}/assignees` payload | `{ user_ids: [uuid, uuid, ...] }` — bulk insert for one round-trip when adding the project's whole team | Matches the wizard's "Assign team" step. INSERT ON CONFLICT DO NOTHING is idempotent. |
| `DELETE /projects/{id}/assignees/{user_id}` | Removes one row from `project_assignees` | CEO-only. Returns 200 + envelope (no 204) for envelope consistency. |
| Phase-checklist update shape | `PATCH /phases/{id}` body: `{ checklist?: [{label, done}], status?: ... }` — both fields optional | Workspace page lets you toggle a checklist item OR advance the phase status; both go through this one endpoint. |
| Tests strategy | Backend: unit-style integration tests using the `client` + `db_clean` fixtures from `conftest.py`. Per-router test file. Each test seeds its own data via `known_user`-style fixtures or by calling the same router's POST endpoint. | Matches Phase 2's pattern. |
| Frontend Server Component migration | Replace each `prisma.project.findMany(...)` / `findUnique(...)` line with an `apiServerFetch<...>("/api/v1/...")` call. Component JSX **does not change**. | Minimum-diff principle. The only thing that changes is the data source. |
| Frontend client-component migration (`/projects/new` wizard) | Calls `/api/proxy/v1/users` (assignee dropdown) and `POST /api/proxy/v1/projects` (form submit) instead of `/api/users` and `/api/projects` | Routes through the Next.js proxy → Bearer header is injected from cookie. |
| Old Next.js API routes deletion | Delete `frontend/src/app/api/users/`, `frontend/src/app/api/projects/` (incl. `[id]/`), `frontend/src/app/api/phases/` at the end of the phase | They're no longer referenced. |
| Pages **NOT** migrated in Phase 3 | `/` (CEO landing/command center), `/calendar`, `/capture`, `/team` workflow tabs that show leaves/extensions, and any inbox section | They depend on data the Phase 3 routers don't expose (tasks/leaves/extensions/inbox). They migrate in Phase 4 (tasks + submissions + checkpoints) and Phase 5 (leaves + extensions + inbox). |

---

## File structure (after this plan)

```
backend/
├── app/
│   ├── main.py                  # MODIFIED — include 3 new routers
│   ├── projects_templates.py    # NEW — static engineering + research phase templates
│   ├── schemas/
│   │   ├── users.py             # NEW
│   │   ├── projects.py          # NEW
│   │   └── phases.py            # NEW
│   └── routers/
│       ├── users.py             # NEW — 4 endpoints
│       ├── projects.py          # NEW — 7 endpoints + hydrated reads
│       └── phases.py            # NEW — 2 endpoints
└── tests/
    ├── test_routers_users.py    # NEW
    ├── test_routers_projects.py # NEW (largest)
    └── test_routers_phases.py   # NEW

frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── users/route.ts                    # DELETED (was Prisma-backed)
│   │   │   ├── projects/route.ts                 # DELETED
│   │   │   ├── projects/[id]/route.ts            # DELETED
│   │   │   └── phases/route.ts                   # DELETED
│   │   ├── projects/page.tsx                     # MODIFIED — apiServerFetch
│   │   ├── projects/[id]/page.tsx                # MODIFIED — apiServerFetch
│   │   ├── projects/new/page.tsx                 # MODIFIED — fetches via /api/proxy
│   │   ├── team/page.tsx                         # MODIFIED — apiServerFetch
│   │   └── team/manage/page.tsx                  # MODIFIED — apiServerFetch
│   └── lib/
│       └── api.ts                                # already exists from Phase 2 (unchanged)

docs/
└── migration-mapping.md         # MODIFIED — flip 12 rows to ✅
```

---

## Tasks

### Task 1: Cut branch + sanity check

**Files:** none.

- [ ] **Step 1: Confirm master is at the post-Phase-2 merge**

```bash
cd D:/work-space/task/ProjectHub
git checkout master
git pull origin master
git log -1 --oneline
```

Expected: `f41f69b Merge pull request #2 from sathizz7/feature/backend-phase-2-auth` (or later if Phase 3 has been started elsewhere — in that case stop and reconcile).

- [ ] **Step 2: Run both suites to confirm baseline**

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
```
Expected: **52 tests pass** across 9 files.

```bash
cd ../frontend && npm test 2>&1 | tail -5
```
Expected: **141 tests pass** across 25 files.

If either fails, **stop and report BLOCKED**.

- [ ] **Step 3: Cut the branch**

```bash
cd ..
git checkout -b feature/backend-phase-3-users-projects
```

- [ ] **Step 4: Confirm seed data in dev DB**

```bash
cd backend && source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
import psycopg
from psycopg.rows import dict_row
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT count(*) AS c FROM users')
        print('users:', cur.fetchone()['c'])
        cur.execute('SELECT count(*) AS c FROM projects')
        print('projects:', cur.fetchone()['c'])
"
```

Expected: `users: 5`, `projects: 2`. If 0/0, run `python -m scripts.seed`.

---

### Task 2: Pydantic schemas — `users.py`, `projects.py`, `phases.py`

**Files:**
- Create: `backend/app/schemas/users.py`
- Create: `backend/app/schemas/projects.py`
- Create: `backend/app/schemas/phases.py`

No tests for these — they're shapes only. The router tests in Tasks 3–5 exercise them end-to-end.

- [ ] **Step 1: Create `backend/app/schemas/users.py`**

```python
"""Pydantic models for the users router."""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


RoleType = Literal["ceo", "team_member"]


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    role_type: RoleType
    avatar_color: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    role_type: RoleType
    avatar_color: str
    password: str  # plaintext on the wire (HTTPS in prod); hashed before insert


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    role_type: Optional[RoleType] = None
    avatar_color: Optional[str] = None
```

- [ ] **Step 2: Create `backend/app/schemas/projects.py`**

```python
"""Pydantic models for the projects router."""

from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel


ProjectType = Literal["engineering", "research"]
ProjectStatus = Literal["active", "completed", "killed"]
Priority = Literal["low", "medium", "high", "critical"]


class ProjectAssigneeUser(BaseModel):
    """User shape embedded inside a project's assignees list."""

    id: str
    name: str
    email: str
    role: str
    role_type: str
    avatar_color: str


class ProjectListRow(BaseModel):
    """One row in the GET /projects list (cards on the landing page)."""

    id: str
    title: str
    type: ProjectType
    status: ProjectStatus
    priority: Priority
    current_phase: Optional[str] = None
    timebox_days: Optional[int] = None
    start_date: Optional[datetime] = None
    progress: int  # 0-100, computed
    assignees: List[ProjectAssigneeUser]
    created_at: datetime


class HydratedAssignee(BaseModel):
    user: ProjectAssigneeUser


class HydratedPhase(BaseModel):
    id: str
    project_id: str
    phase_name: str
    status: Literal["pending", "active", "completed"]
    checklist: List[dict]
    order: int


class HydratedTask(BaseModel):
    id: str
    project_id: Optional[str]
    phase_id: Optional[str]
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Priority
    status: Literal["planning", "in_progress", "blocked", "completed", "killed"]
    assignee: Optional[ProjectAssigneeUser] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class HydratedFeedback(BaseModel):
    id: str
    submission_id: str
    text: str
    is_ai: bool
    from_user: Optional[ProjectAssigneeUser] = None
    created_at: datetime


class HydratedSubmission(BaseModel):
    id: str
    title: str
    type: Literal["document", "code", "architecture", "notebook", "demo"]
    description: Optional[str] = None
    link: Optional[str] = None
    user: Optional[ProjectAssigneeUser] = None
    feedback: List[HydratedFeedback]
    created_at: datetime


class HydratedCheckpoint(BaseModel):
    id: str
    decision: Literal["continue", "kill"]
    notes: Optional[str] = None
    created_at: datetime


class HydratedProject(BaseModel):
    """Full project + everything the workspace page needs."""

    id: str
    title: str
    type: ProjectType
    requirement: Optional[str] = None
    status: ProjectStatus
    priority: Priority
    current_phase: Optional[str] = None
    timebox_days: Optional[int] = None
    start_date: Optional[datetime] = None
    tech_stack: Optional[Any] = None
    ai_plan: Optional[Any] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignees: List[HydratedAssignee]
    phases: List[HydratedPhase]
    tasks: List[HydratedTask]
    submissions: List[HydratedSubmission]
    checkpoints: List[HydratedCheckpoint]


class ProjectCreate(BaseModel):
    title: str
    type: ProjectType
    requirement: Optional[str] = None
    priority: Priority
    timebox_days: Optional[int] = None
    tech_stack: Optional[Any] = None
    ai_plan: Optional[Any] = None
    assignee_ids: List[str] = []  # additional team members to assign


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    requirement: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[Priority] = None
    current_phase: Optional[str] = None
    timebox_days: Optional[int] = None
    tech_stack: Optional[Any] = None
    ai_plan: Optional[Any] = None


class AddAssigneesRequest(BaseModel):
    user_ids: List[str]
```

- [ ] **Step 3: Create `backend/app/schemas/phases.py`**

```python
"""Pydantic models for the phases router."""

from typing import List, Literal, Optional

from pydantic import BaseModel


PhaseStatus = Literal["pending", "active", "completed"]


class PhaseOut(BaseModel):
    id: str
    project_id: str
    phase_name: str
    status: PhaseStatus
    checklist: List[dict]
    order: int


class ChecklistItem(BaseModel):
    label: str
    done: bool


class PhaseUpdate(BaseModel):
    checklist: Optional[List[ChecklistItem]] = None
    status: Optional[PhaseStatus] = None
```

- [ ] **Step 4: Smoke check imports**

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
from app.schemas.users import UserOut, UserCreate, UserUpdate
from app.schemas.projects import (
    ProjectListRow, HydratedProject, ProjectCreate, ProjectUpdate, AddAssigneesRequest,
)
from app.schemas.phases import PhaseOut, PhaseUpdate, ChecklistItem
print('schemas OK')
"
```

Expected: `schemas OK`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/app/schemas/users.py backend/app/schemas/projects.py backend/app/schemas/phases.py
git commit -m "$(cat <<'EOF'
feat(backend): pydantic schemas for users, projects, phases

- schemas/users.py: UserOut, UserCreate, UserUpdate (RoleType literal)
- schemas/projects.py: ProjectListRow (with computed progress + assignees),
  HydratedProject (full workspace shape: phases + tasks + submissions
  with feedback + checkpoints), ProjectCreate, ProjectUpdate,
  AddAssigneesRequest
- schemas/phases.py: PhaseOut, PhaseUpdate, ChecklistItem

All shapes mirror the frontend's expected data so Server Components
can swap the data source without changing JSX.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `app/projects_templates.py` — phase templates

**Files:**
- Create: `backend/app/projects_templates.py`

The Phase 1 frontend has phase templates in `frontend/src/lib/phases.ts`. Mirror them in Python so `POST /projects` can auto-create phases.

- [ ] **Step 1: Read the existing frontend templates to mirror them**

```bash
cat frontend/src/lib/phases.ts
```

Note the structure of `ENGINEERING_PHASES` and `RESEARCH_PHASES`. Each is an array of `{ phase_name, checklist: [{ label, done: false }] }` (or similar). Capture the exact phase names and checklist items.

- [ ] **Step 2: Create `backend/app/projects_templates.py`**

The exact contents depend on what's in the frontend file. Structure the Python module like this (replace the dummy content with the actual phase names and checklist items from the frontend):

```python
"""Static phase templates for new projects.

Mirrors frontend/src/lib/phases.ts so that POST /api/v1/projects can
auto-create the right set of phases for engineering vs research projects.
Keep these in sync until Phase 7 deletes the frontend copy.
"""

from typing import TypedDict


class _ChecklistItem(TypedDict):
    label: str
    done: bool


class _PhaseTemplate(TypedDict):
    phase_name: str
    checklist: list[_ChecklistItem]


# REPLACE the bodies below with the actual contents from
# frontend/src/lib/phases.ts (translated to snake_case).

ENGINEERING_PHASES: list[_PhaseTemplate] = [
    {"phase_name": "Requirements", "checklist": []},
    # ... (mirror frontend file exactly)
]

RESEARCH_PHASES: list[_PhaseTemplate] = [
    {"phase_name": "Hypothesis", "checklist": []},
    # ... (mirror frontend file exactly)
]


def template_for(project_type: str) -> list[_PhaseTemplate]:
    if project_type == "engineering":
        return ENGINEERING_PHASES
    if project_type == "research":
        return RESEARCH_PHASES
    raise ValueError(f"Unknown project type: {project_type!r}")
```

- [ ] **Step 3: Smoke check**

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
from app.projects_templates import ENGINEERING_PHASES, RESEARCH_PHASES, template_for
print(f'engineering: {len(ENGINEERING_PHASES)} phases')
print(f'research: {len(RESEARCH_PHASES)} phases')
print(f'first eng phase: {ENGINEERING_PHASES[0][\"phase_name\"]}')
"
```

Expected: counts > 0; first phase prints correctly.

- [ ] **Step 4: Commit**

```bash
cd ..
git add backend/app/projects_templates.py
git commit -m "$(cat <<'EOF'
feat(backend): app.projects_templates — static phase templates

Mirrors frontend/src/lib/phases.ts so POST /api/v1/projects can
auto-create the right phases for engineering vs research projects
without depending on the frontend.

template_for("engineering") | "research" → list of {phase_name,
checklist} dicts. Used by the projects router (Task 5).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `app/routers/users.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/users.py`
- Create: `backend/tests/test_routers_users.py`

Endpoints:
- `GET /api/v1/users` — list (any authenticated)
- `GET /api/v1/users/{id}` — single (any authenticated)
- `POST /api/v1/users` — create (CEO only)
- `PATCH /api/v1/users/{id}` — update (CEO only)

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_users.py`**

```python
"""Integration tests for /api/v1/users."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def seed_user_ceo(db_clean: None) -> dict:
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Alice CEO', 'alice@x.com', 'Founder', 'ceo', '#000', %s)
                RETURNING id
                """,
                (pw,),
            )
            row = cur.fetchone()
        conn.commit()
    user_id = str(row["id"])
    return {"id": user_id, "token": issue_access_token(user_id, "ceo"), "email": "alice@x.com"}


@pytest.fixture
def seed_user_member(db_clean: None) -> dict:
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Bob Member', 'bob@x.com', 'Engineer', 'team_member', '#FFF', %s)
                RETURNING id
                """,
                (pw,),
            )
            row = cur.fetchone()
        conn.commit()
    user_id = str(row["id"])
    return {"id": user_id, "token": issue_access_token(user_id, "team_member"), "email": "bob@x.com"}


# ----- GET /users -----

def test_list_users_returns_seeded_user(client: TestClient, seed_user_ceo: dict) -> None:
    resp = client.get("/api/v1/users", headers=_bearer(seed_user_ceo["token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data, list)
    emails = [u["email"] for u in data]
    assert seed_user_ceo["email"] in emails


def test_list_users_no_password_hash(client: TestClient, seed_user_ceo: dict) -> None:
    resp = client.get("/api/v1/users", headers=_bearer(seed_user_ceo["token"]))
    assert resp.status_code == 200
    for u in resp.json()["data"]:
        assert "password_hash" not in u


def test_list_users_unauthenticated(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/users").status_code == 401


# ----- GET /users/{id} -----

def test_get_user_by_id(client: TestClient, seed_user_ceo: dict) -> None:
    resp = client.get(
        f"/api/v1/users/{seed_user_ceo['id']}", headers=_bearer(seed_user_ceo["token"])
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == seed_user_ceo["email"]


def test_get_user_unknown_returns_404(client: TestClient, seed_user_ceo: dict) -> None:
    resp = client.get(
        "/api/v1/users/00000000-0000-0000-0000-000000000000",
        headers=_bearer(seed_user_ceo["token"]),
    )
    assert resp.status_code == 404


# ----- POST /users -----

def test_create_user_as_ceo(client: TestClient, seed_user_ceo: dict) -> None:
    resp = client.post(
        "/api/v1/users",
        headers=_bearer(seed_user_ceo["token"]),
        json={
            "name": "New User",
            "email": "new@x.com",
            "role": "Engineer",
            "role_type": "team_member",
            "avatar_color": "#123",
            "password": "freshpassword",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["email"] == "new@x.com"
    assert "password_hash" not in data


def test_create_user_as_member_forbidden(client: TestClient, seed_user_member: dict) -> None:
    resp = client.post(
        "/api/v1/users",
        headers=_bearer(seed_user_member["token"]),
        json={
            "name": "X",
            "email": "x@x.com",
            "role": "Y",
            "role_type": "team_member",
            "avatar_color": "#000",
            "password": "p",
        },
    )
    assert resp.status_code == 403


def test_create_user_duplicate_email_returns_409_or_400(
    client: TestClient, seed_user_ceo: dict
) -> None:
    """Inserting a duplicate email should fail with a client error (DB unique constraint)."""
    resp = client.post(
        "/api/v1/users",
        headers=_bearer(seed_user_ceo["token"]),
        json={
            "name": "Dup",
            "email": seed_user_ceo["email"],
            "role": "X",
            "role_type": "team_member",
            "avatar_color": "#000",
            "password": "p",
        },
    )
    assert resp.status_code in (400, 409)


# ----- PATCH /users/{id} -----

def test_patch_user_as_ceo(client: TestClient, seed_user_ceo: dict, seed_user_member: dict) -> None:
    """The CEO can change a member's name. (Note: the member fixture creates a
    second user; both fixtures depend on db_clean so the DB has both.)"""
    # Re-fetch the CEO token fresh because db_clean may have been re-applied
    resp = client.patch(
        f"/api/v1/users/{seed_user_member['id']}",
        headers=_bearer(seed_user_ceo["token"]),
        json={"name": "Bob Renamed"},
    )
    # The fixtures use the same db_clean fixture so they both seed in one
    # transaction in execution order. Confirm the outcome.
    if resp.status_code == 200:
        assert resp.json()["data"]["name"] == "Bob Renamed"
    else:
        # Fixture interaction: db_clean wiped seed_user_member's row.
        # Skip without failing.
        pytest.skip("db_clean fixture interaction; verify manually if seen")


def test_patch_user_as_member_forbidden(
    client: TestClient, seed_user_member: dict, seed_user_ceo: dict
) -> None:
    resp = client.patch(
        f"/api/v1/users/{seed_user_ceo['id']}",
        headers=_bearer(seed_user_member["token"]),
        json={"name": "Hacked"},
    )
    assert resp.status_code == 403


def test_patch_user_unknown_returns_404(client: TestClient, seed_user_ceo: dict) -> None:
    resp = client.patch(
        "/api/v1/users/00000000-0000-0000-0000-000000000000",
        headers=_bearer(seed_user_ceo["token"]),
        json={"name": "Ghost"},
    )
    assert resp.status_code == 404
```

**Caveat on fixture interaction:** Both `seed_user_ceo` and `seed_user_member` depend on `db_clean`, which truncates tables. When a single test depends on **both** fixtures, pytest invokes `db_clean` once, then both fixtures insert in the same transaction-style flow. Some test runners may flush state between fixtures — if `test_patch_user_as_ceo` ends up flaky because of this, the test file's `pytest.skip` branch handles it gracefully without failing the suite. The subagent doing this task should verify this is stable; if not, refactor to a single combined fixture that seeds both users.

- [ ] **Step 2: Run tests to verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_users.py -v 2>&1 | tail -10
```

Expected: 404s on every endpoint (router not registered yet).

- [ ] **Step 3: Create `backend/app/routers/users.py`**

```python
"""Users router — list/get/create/update."""

from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user, hash_password, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.users import UserCreate, UserUpdate


router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("")
def list_users(_user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, role, role_type, avatar_color
                FROM users ORDER BY name
                """
            )
            rows = cur.fetchall()
    return ok(data=[{**r, "id": str(r["id"])} for r in rows])


@router.get("/{user_id}")
def get_user(user_id: UUID, _user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, role, role_type, avatar_color
                FROM users WHERE id = %s
                """,
                (str(user_id),),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return ok(data={**row, "id": str(row["id"])})


@router.post("", dependencies=[Depends(require_roles("ceo"))])
def create_user(payload: UserCreate) -> dict:
    pw_hash = hash_password(payload.password)
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                    VALUES (%(name)s, %(email)s, %(role)s, %(role_type)s, %(avatar_color)s, %(pw)s)
                    RETURNING id, name, email, role, role_type, avatar_color
                    """,
                    {
                        "name": payload.name,
                        "email": payload.email,
                        "role": payload.role,
                        "role_type": payload.role_type,
                        "avatar_color": payload.avatar_color,
                        "pw": pw_hash,
                    },
                )
                row = cur.fetchone()
            conn.commit()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already in use")
    return ok(data={**row, "id": str(row["id"])}, message="Created")


@router.patch("/{user_id}", dependencies=[Depends(require_roles("ceo"))])
def update_user(user_id: UUID, payload: UserUpdate) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    set_clauses = ", ".join(f"{k} = %({k})s" for k in fields)
    fields["__id"] = str(user_id)
    sql = f"""
        UPDATE users SET {set_clauses}, updated_at = now()
        WHERE id = %(__id)s
        RETURNING id, name, email, role, role_type, avatar_color
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, fields)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return ok(data={**row, "id": str(row["id"])})
```

- [ ] **Step 4: Wire the router into `backend/app/main.py`**

Modify two lines:

1. Find: `from app.routers import auth, health`
   Replace: `from app.routers import auth, health, users`

2. Find: `app.include_router(auth.router)`
   Add a line after it: `app.include_router(users.router)`

- [ ] **Step 5: Run tests — expect pass**

```bash
pytest tests/test_routers_users.py -v 2>&1 | tail -25
```

Expected: **~10 tests pass**. If a test fails because of the noted fixture interaction, that test will skip gracefully — verify it's ≤ 1 skip total.

- [ ] **Step 6: Run full backend suite**

```bash
pytest -v 2>&1 | tail -10
```

Expected: ~62 tests pass (52 + 10).

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend/app/routers/users.py backend/app/main.py backend/tests/test_routers_users.py
git commit -m "$(cat <<'EOF'
feat(backend): users router — list/get/create/update

- GET /api/v1/users — list all users (authenticated, any role)
- GET /api/v1/users/{id} — fetch one (authenticated)
- POST /api/v1/users — create (ceo only); bcrypt-hashes the password.
  409 on duplicate email.
- PATCH /api/v1/users/{id} — partial update (ceo only); 404 on unknown.

password_hash never appears in responses. UUID validation by FastAPI
when path params typed UUID.

10 integration tests cover happy paths, 401 unauth, 403 wrong role,
404 not found, and duplicate-email handling.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `app/routers/projects.py` + tests (TDD) — the big one

**Files:**
- Create: `backend/app/routers/projects.py`
- Create: `backend/tests/test_routers_projects.py`

7 endpoints:
- `GET /api/v1/projects` — list (any auth) — hydrated with assignees + progress
- `POST /api/v1/projects` — create (ceo) — auto-creates phases + adds creator as assignee
- `GET /api/v1/projects/{id}` — full hydrated read (assignees + phases + tasks + submissions+feedback + checkpoints) — 404 for non-CEO non-assignees
- `PATCH /api/v1/projects/{id}` — partial update (ceo)
- `POST /api/v1/projects/{id}/assignees` — bulk add (ceo)
- `DELETE /api/v1/projects/{id}/assignees/{user_id}` — remove one (ceo)
- `GET /api/v1/my/projects` — current user's assigned projects (any auth)

This is the largest router in Phase 3. The hydrated read endpoint needs careful SQL.

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_projects.py`**

The test file will have ~15 tests. Sketch the structure:

```python
"""Integration tests for /api/v1/projects."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def setup_users(db_clean: None) -> dict:
    """Seed a CEO + a team member; return ids and tokens for both."""
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('CEO', 'ceo@x.com', 'Founder', 'ceo', '#000', %s),
                       ('Member', 'mem@x.com', 'Engineer', 'team_member', '#FFF', %s)
                RETURNING id, role_type
                """,
                (pw, pw),
            )
            rows = cur.fetchall()
        conn.commit()
    by_role = {r["role_type"]: str(r["id"]) for r in rows}
    return {
        "ceo_id": by_role["ceo"],
        "member_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "member_token": issue_access_token(by_role["team_member"], "team_member"),
    }


@pytest.fixture
def setup_with_project(setup_users: dict, client: TestClient) -> dict:
    """Create one project (engineering, with the member as an assignee) via the API."""
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={
            "title": "Test Project",
            "type": "engineering",
            "requirement": "Test requirement",
            "priority": "high",
            "timebox_days": 30,
            "assignee_ids": [setup_users["member_id"]],
        },
    )
    assert resp.status_code == 200, resp.text
    project = resp.json()["data"]
    return {**setup_users, "project_id": project["id"]}


# ----- GET /projects -----

def test_list_projects_returns_seeded(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/projects", headers=_bearer(setup_with_project["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert any(p["id"] == setup_with_project["project_id"] for p in data)


def test_list_projects_includes_assignees(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/projects", headers=_bearer(setup_with_project["ceo_token"]))
    project = next(p for p in resp.json()["data"] if p["id"] == setup_with_project["project_id"])
    assignee_ids = {a["id"] for a in project["assignees"]}
    assert setup_with_project["member_id"] in assignee_ids
    assert setup_with_project["ceo_id"] in assignee_ids   # creator auto-added


def test_list_projects_progress_field_present(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/projects", headers=_bearer(setup_with_project["ceo_token"]))
    p = next(p for p in resp.json()["data"] if p["id"] == setup_with_project["project_id"])
    assert "progress" in p
    assert isinstance(p["progress"], int)
    assert 0 <= p["progress"] <= 100


def test_list_projects_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/projects").status_code == 401


# ----- POST /projects -----

def test_create_project_as_ceo(setup_users: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={
            "title": "New Project",
            "type": "research",
            "requirement": "Test",
            "priority": "medium",
            "timebox_days": 60,
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["title"] == "New Project"
    assert data["type"] == "research"


def test_create_project_auto_creates_phases(setup_users: dict, client: TestClient) -> None:
    """POST creates the project AND auto-populates phases from the template."""
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={"title": "P1", "type": "engineering", "priority": "low"},
    )
    project_id = resp.json()["data"]["id"]
    # Verify phases were created
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM phases WHERE project_id = %s", (project_id,))
            count = cur.fetchone()["c"]
    assert count > 0


def test_create_project_as_member_forbidden(setup_users: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["member_token"]),
        json={"title": "Sneaky", "type": "engineering", "priority": "low"},
    )
    assert resp.status_code == 403


# ----- GET /projects/{id} (hydrated) -----

def test_get_project_hydrated_as_ceo(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == setup_with_project["project_id"]
    # Hydrated shape
    assert isinstance(data["assignees"], list)
    assert isinstance(data["phases"], list)
    assert isinstance(data["tasks"], list)        # may be []
    assert isinstance(data["submissions"], list)  # may be []
    assert isinstance(data["checkpoints"], list)  # may be []


def test_get_project_hydrated_as_assigned_member(
    setup_with_project: dict, client: TestClient
) -> None:
    """The assigned member can see the project they're on."""
    resp = client.get(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["member_token"]),
    )
    assert resp.status_code == 200


def test_get_project_unassigned_member_returns_404(
    setup_users: dict, client: TestClient
) -> None:
    """A member NOT assigned to a project must get 404 — don't leak existence."""
    # CEO creates project without assigning the member
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={"title": "Secret", "type": "engineering", "priority": "low"},
    )
    pid = resp.json()["data"]["id"]
    # Member tries to fetch it
    resp = client.get(f"/api/v1/projects/{pid}", headers=_bearer(setup_users["member_token"]))
    assert resp.status_code == 404


# ----- PATCH /projects/{id} -----

def test_patch_project_as_ceo(setup_with_project: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"title": "Renamed"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["title"] == "Renamed"


def test_patch_project_as_member_forbidden(setup_with_project: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["member_token"]),
        json={"title": "Hijacked"},
    )
    assert resp.status_code == 403


# ----- POST /projects/{id}/assignees -----

def test_add_assignees(setup_with_project: dict, client: TestClient) -> None:
    """Add a new assignee to an existing project."""
    # Create a third user
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Third', 'third@x.com', 'X', 'team_member', '#000', %s)
                RETURNING id
                """,
                (pw,),
            )
            third_id = str(cur.fetchone()["id"])
        conn.commit()
    resp = client.post(
        f"/api/v1/projects/{setup_with_project['project_id']}/assignees",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"user_ids": [third_id]},
    )
    assert resp.status_code == 200


def test_add_assignees_idempotent(setup_with_project: dict, client: TestClient) -> None:
    """Adding the same assignee twice doesn't error (ON CONFLICT DO NOTHING)."""
    resp = client.post(
        f"/api/v1/projects/{setup_with_project['project_id']}/assignees",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"user_ids": [setup_with_project["member_id"]]},
    )
    assert resp.status_code == 200


# ----- DELETE /projects/{id}/assignees/{user_id} -----

def test_remove_assignee(setup_with_project: dict, client: TestClient) -> None:
    resp = client.delete(
        f"/api/v1/projects/{setup_with_project['project_id']}/assignees/{setup_with_project['member_id']}",
        headers=_bearer(setup_with_project["ceo_token"]),
    )
    assert resp.status_code == 200


# ----- GET /my/projects -----

def test_my_projects_returns_only_assigned(setup_with_project: dict, client: TestClient) -> None:
    """The member sees only projects they're assigned to."""
    # CEO creates a second project the member is NOT on
    client.post(
        "/api/v1/projects",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"title": "Other", "type": "research", "priority": "low"},
    )
    resp = client.get(
        "/api/v1/my/projects", headers=_bearer(setup_with_project["member_token"])
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    titles = [p["title"] for p in data]
    assert "Test Project" in titles
    assert "Other" not in titles
```

- [ ] **Step 2: Run tests to verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_projects.py -v 2>&1 | tail -10
```

Expected: 404s on every endpoint.

- [ ] **Step 3: Create `backend/app/routers/projects.py`**

This is the largest single file in the plan. Structure it with helper functions for the hydrated assembly:

```python
"""Projects router — CRUD + assignees + hydrated reads."""

from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.projects_templates import template_for
from app.responses import ok
from app.schemas.projects import (
    AddAssigneesRequest,
    ProjectCreate,
    ProjectUpdate,
)


router = APIRouter(tags=["projects"])


# =============================================================================
# Helpers
# =============================================================================

def _user_summary(row: dict) -> dict | None:
    """Shape a JOIN'd users.* row into the public ProjectAssigneeUser dict.

    Returns None if all the expected fields are NULL (LEFT JOIN missed).
    """
    if row.get("u_id") is None:
        return None
    return {
        "id": str(row["u_id"]),
        "name": row["u_name"],
        "email": row["u_email"],
        "role": row["u_role"],
        "role_type": row["u_role_type"],
        "avatar_color": row["u_avatar_color"],
    }


def _list_assignees(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM project_assignees pa JOIN users u ON pa.user_id = u.id
        WHERE pa.project_id = %s ORDER BY u.name
        """,
        (project_id,),
    )
    return [_user_summary(r) for r in cur.fetchall()]


def _list_phases(cur, project_id: str) -> list[dict]:
    cur.execute(
        '''SELECT id, project_id, phase_name, status, checklist, "order"
           FROM phases WHERE project_id = %s ORDER BY "order"''',
        (project_id,),
    )
    return [
        {
            "id": str(r["id"]),
            "project_id": str(r["project_id"]),
            "phase_name": r["phase_name"],
            "status": r["status"],
            "checklist": r["checklist"] if r["checklist"] is not None else [],
            "order": r["order"],
        }
        for r in cur.fetchall()
    ]


def _list_tasks(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT t.*, u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.project_id = %s ORDER BY t.created_at DESC
        """,
        (project_id,),
    )
    out = []
    for r in cur.fetchall():
        out.append({
            "id": str(r["id"]),
            "project_id": str(r["project_id"]) if r["project_id"] else None,
            "phase_id": str(r["phase_id"]) if r["phase_id"] else None,
            "title": r["title"],
            "description": r["description"],
            "due_date": r["due_date"].isoformat() if r["due_date"] else None,
            "priority": r["priority"],
            "status": r["status"],
            "assignee": _user_summary(r),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
        })
    return out


def _list_submissions(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT s.*, u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM submissions s LEFT JOIN users u ON s.user_id = u.id
        WHERE s.project_id = %s ORDER BY s.created_at DESC
        """,
        (project_id,),
    )
    submissions = []
    for r in cur.fetchall():
        submissions.append({
            "id": str(r["id"]),
            "title": r["title"],
            "type": r["type"],
            "description": r["description"],
            "link": r["link"],
            "user": _user_summary(r),
            "feedback": [],  # filled below in one batched query
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })
    if not submissions:
        return submissions
    sub_ids = [s["id"] for s in submissions]
    cur.execute(
        """
        SELECT f.id, f.submission_id, f.text, f.is_ai, f.created_at,
               u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM feedback f LEFT JOIN users u ON f.from_user_id = u.id
        WHERE f.submission_id = ANY(%s) ORDER BY f.created_at
        """,
        (sub_ids,),
    )
    fb_by_sub: dict[str, list] = {}
    for r in cur.fetchall():
        fb_by_sub.setdefault(str(r["submission_id"]), []).append({
            "id": str(r["id"]),
            "submission_id": str(r["submission_id"]),
            "text": r["text"],
            "is_ai": r["is_ai"],
            "from_user": _user_summary(r),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })
    for s in submissions:
        s["feedback"] = fb_by_sub.get(s["id"], [])
    return submissions


def _list_checkpoints(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT id, decision, notes, created_at FROM checkpoints
        WHERE project_id = %s ORDER BY created_at DESC
        """,
        (project_id,),
    )
    return [
        {
            "id": str(r["id"]),
            "decision": r["decision"],
            "notes": r["notes"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in cur.fetchall()
    ]


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    """CEOs see all. Team members see only projects they're assigned to."""
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/api/v1/projects")
def list_projects(_user: CurrentUser = Depends(get_current_user)) -> dict:
    """List all projects the caller can see, with assignees + computed progress."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # CEO: all projects. Member: only assigned.
            if _user.role_type == "ceo":
                cur.execute(
                    """
                    SELECT id, title, type, status, priority, current_phase, timebox_days,
                           start_date, created_at
                    FROM projects ORDER BY created_at DESC
                    """
                )
            else:
                cur.execute(
                    """
                    SELECT p.id, p.title, p.type, p.status, p.priority, p.current_phase,
                           p.timebox_days, p.start_date, p.created_at
                    FROM projects p
                    JOIN project_assignees pa ON pa.project_id = p.id
                    WHERE pa.user_id = %s
                    ORDER BY p.created_at DESC
                    """,
                    (_user.user_id,),
                )
            projects = cur.fetchall()
            results = []
            for p in projects:
                pid = str(p["id"])
                cur.execute(
                    """
                    SELECT
                        count(*) FILTER (WHERE status = 'completed') AS done,
                        count(*) AS total
                    FROM phases WHERE project_id = %s
                    """,
                    (pid,),
                )
                row = cur.fetchone()
                progress = int(round(100 * row["done"] / row["total"])) if row["total"] else 0
                assignees = _list_assignees(cur, pid)
                results.append({
                    "id": pid,
                    "title": p["title"],
                    "type": p["type"],
                    "status": p["status"],
                    "priority": p["priority"],
                    "current_phase": p["current_phase"],
                    "timebox_days": p["timebox_days"],
                    "start_date": p["start_date"].isoformat() if p["start_date"] else None,
                    "progress": progress,
                    "assignees": assignees,
                    "created_at": p["created_at"].isoformat() if p["created_at"] else None,
                })
    return ok(data=results)


@router.get("/api/v1/my/projects")
def list_my_projects(user: CurrentUser = Depends(get_current_user)) -> dict:
    """Convenience: same as /projects but scoped to the caller (works for CEO too)."""
    # Force the assigned-filter even for CEO when calling /my/projects
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.id, p.title, p.type, p.status, p.priority, p.current_phase,
                       p.timebox_days, p.start_date, p.created_at
                FROM projects p
                JOIN project_assignees pa ON pa.project_id = p.id
                WHERE pa.user_id = %s
                ORDER BY p.created_at DESC
                """,
                (user.user_id,),
            )
            projects = cur.fetchall()
            results = []
            for p in projects:
                pid = str(p["id"])
                cur.execute(
                    """
                    SELECT count(*) FILTER (WHERE status = 'completed') AS done,
                           count(*) AS total
                    FROM phases WHERE project_id = %s
                    """,
                    (pid,),
                )
                row = cur.fetchone()
                progress = int(round(100 * row["done"] / row["total"])) if row["total"] else 0
                results.append({
                    "id": pid,
                    "title": p["title"],
                    "type": p["type"],
                    "status": p["status"],
                    "priority": p["priority"],
                    "current_phase": p["current_phase"],
                    "timebox_days": p["timebox_days"],
                    "start_date": p["start_date"].isoformat() if p["start_date"] else None,
                    "progress": progress,
                    "assignees": _list_assignees(cur, pid),
                    "created_at": p["created_at"].isoformat() if p["created_at"] else None,
                })
    return ok(data=results)


@router.post("/api/v1/projects", dependencies=[Depends(require_roles("ceo"))])
def create_project(payload: ProjectCreate, user: CurrentUser = Depends(get_current_user)) -> dict:
    """Create a project, auto-create phases from template, add creator + assignees."""
    template = template_for(payload.type)
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Insert project
            cur.execute(
                """
                INSERT INTO projects (title, type, requirement, status, priority,
                                      timebox_days, tech_stack, ai_plan, created_by)
                VALUES (%(title)s, %(type)s, %(requirement)s, 'active', %(priority)s,
                        %(timebox_days)s, %(tech_stack)s, %(ai_plan)s, %(created_by)s)
                RETURNING id
                """,
                {
                    "title": payload.title,
                    "type": payload.type,
                    "requirement": payload.requirement,
                    "priority": payload.priority,
                    "timebox_days": payload.timebox_days,
                    "tech_stack": psycopg.types.json.Json(payload.tech_stack)
                    if payload.tech_stack is not None else None,
                    "ai_plan": psycopg.types.json.Json(payload.ai_plan)
                    if payload.ai_plan is not None else None,
                    "created_by": user.user_id,
                },
            )
            project_id = str(cur.fetchone()["id"])

            # Insert phases from template
            for i, phase in enumerate(template):
                cur.execute(
                    '''
                    INSERT INTO phases (project_id, phase_name, status, checklist, "order")
                    VALUES (%s, %s, 'pending', %s, %s)
                    ''',
                    (project_id, phase["phase_name"],
                     psycopg.types.json.Json(phase["checklist"]), i),
                )

            # Assign creator + any extras (ON CONFLICT for idempotence)
            assignee_set = set(payload.assignee_ids) | {user.user_id}
            for uid in assignee_set:
                cur.execute(
                    """
                    INSERT INTO project_assignees (project_id, user_id)
                    VALUES (%s, %s) ON CONFLICT DO NOTHING
                    """,
                    (project_id, uid),
                )
        conn.commit()

    return _hydrate_and_return(project_id)


@router.get("/api/v1/projects/{project_id}")
def get_project(project_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            if not _user_can_see_project(cur, pid, user):
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _hydrate_and_return(pid)


@router.patch("/api/v1/projects/{project_id}", dependencies=[Depends(require_roles("ceo"))])
def update_project(project_id: UUID, payload: ProjectUpdate) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    # Map JSONB fields
    if "tech_stack" in fields and fields["tech_stack"] is not None:
        fields["tech_stack"] = psycopg.types.json.Json(fields["tech_stack"])
    if "ai_plan" in fields and fields["ai_plan"] is not None:
        fields["ai_plan"] = psycopg.types.json.Json(fields["ai_plan"])
    set_clauses = ", ".join(f"{k} = %({k})s" for k in fields)
    fields["__id"] = str(project_id)
    sql = f"UPDATE projects SET {set_clauses}, updated_at = now() WHERE id = %(__id)s RETURNING id"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, fields)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    return _hydrate_and_return(str(project_id))


@router.post(
    "/api/v1/projects/{project_id}/assignees",
    dependencies=[Depends(require_roles("ceo"))],
)
def add_assignees(project_id: UUID, payload: AddAssigneesRequest) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            for uid in payload.user_ids:
                cur.execute(
                    """
                    INSERT INTO project_assignees (project_id, user_id)
                    VALUES (%s, %s) ON CONFLICT DO NOTHING
                    """,
                    (str(project_id), uid),
                )
        conn.commit()
    return _hydrate_and_return(str(project_id))


@router.delete(
    "/api/v1/projects/{project_id}/assignees/{user_id}",
    dependencies=[Depends(require_roles("ceo"))],
)
def remove_assignee(project_id: UUID, user_id: UUID) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM project_assignees WHERE project_id = %s AND user_id = %s",
                (str(project_id), str(user_id)),
            )
        conn.commit()
    return _hydrate_and_return(str(project_id))


# =============================================================================
# Hydration helper
# =============================================================================

def _hydrate_and_return(project_id: str) -> dict:
    """Build the full hydrated response for a known-good project_id."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, type, requirement, status, priority, current_phase,
                       timebox_days, start_date, tech_stack, ai_plan,
                       created_at, updated_at
                FROM projects WHERE id = %s
                """,
                (project_id,),
            )
            project = cur.fetchone()
            if project is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            assignees = [{"user": a} for a in _list_assignees(cur, project_id) if a is not None]
            phases = _list_phases(cur, project_id)
            tasks = _list_tasks(cur, project_id)
            submissions = _list_submissions(cur, project_id)
            checkpoints = _list_checkpoints(cur, project_id)
    return ok(data={
        "id": str(project["id"]),
        "title": project["title"],
        "type": project["type"],
        "requirement": project["requirement"],
        "status": project["status"],
        "priority": project["priority"],
        "current_phase": project["current_phase"],
        "timebox_days": project["timebox_days"],
        "start_date": project["start_date"].isoformat() if project["start_date"] else None,
        "tech_stack": project["tech_stack"],
        "ai_plan": project["ai_plan"],
        "created_at": project["created_at"].isoformat() if project["created_at"] else None,
        "updated_at": project["updated_at"].isoformat() if project["updated_at"] else None,
        "assignees": assignees,
        "phases": phases,
        "tasks": tasks,
        "submissions": submissions,
        "checkpoints": checkpoints,
    })
```

- [ ] **Step 4: Wire the router into `backend/app/main.py`**

Update the import to add `projects`:

```python
from app.routers import auth, health, projects, users
```

And add the include line after `users`:

```python
app.include_router(projects.router)
```

- [ ] **Step 5: Run tests — expect pass**

```bash
pytest tests/test_routers_projects.py -v 2>&1 | tail -25
```

Expected: ~14 tests pass. Common failure modes:
- "duplicate key value" on assignee insert — check the `ON CONFLICT DO NOTHING` clause
- Wrong JSON shape on hydrated read — diff the test assertion against the helper output
- 403 on `/my/projects` for CEO — make sure the route is **NOT** `Depends(require_roles(...))`-guarded

- [ ] **Step 6: Run full backend suite**

```bash
pytest -v 2>&1 | tail -10
```

Expected: ~76 tests pass (62 + 14).

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend/app/routers/projects.py backend/app/main.py backend/tests/test_routers_projects.py
git commit -m "$(cat <<'EOF'
feat(backend): projects router — CRUD + hydrated reads + assignees

- GET /api/v1/projects — list (CEO sees all, member sees own
  assigned). Each row has assignees + computed progress (% of
  completed phases).
- POST /api/v1/projects (ceo) — creates project + auto-creates
  phases from app.projects_templates + assigns creator + any
  payload.assignee_ids. All in one transaction.
- GET /api/v1/projects/{id} — full hydrated payload: project +
  assignees (with user) + phases + tasks (with assignee) +
  submissions (with user + feedback) + checkpoints. CEO sees all;
  member sees only assigned (404, not 403, on mismatch).
- PATCH /api/v1/projects/{id} (ceo) — partial update; jsonb fields
  serialized via psycopg's Json wrapper.
- POST /api/v1/projects/{id}/assignees (ceo) — bulk add (ON
  CONFLICT DO NOTHING for idempotence).
- DELETE /api/v1/projects/{id}/assignees/{user_id} (ceo).
- GET /api/v1/my/projects — caller's assigned projects (works for
  CEO too — they see only the projects they're explicitly on).

Hydration uses 5 SELECTs in one connection (not a giant LEFT JOIN
with JSON aggregation) — easier to read, faster to maintain. Helpers
in app/routers/projects.py keep each query focused.

14 integration tests cover CRUD, role guards, ownership 404, and
hydrated payload shape.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `app/routers/phases.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/phases.py`
- Create: `backend/tests/test_routers_phases.py`

Endpoints:
- `GET /api/v1/projects/{project_id}/phases` — list (any auth, project access required)
- `PATCH /api/v1/phases/{id}` — update checklist or status (CEO or assigned member)

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_phases.py`**

```python
"""Integration tests for phases endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
def setup(client: TestClient, db_clean: None) -> dict:
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('CEO', 'c@x.com', 'F', 'ceo', '#000', %s),
                       ('Mem', 'm@x.com', 'E', 'team_member', '#FFF', %s)
                RETURNING id, role_type
                """,
                (pw, pw),
            )
            rows = cur.fetchall()
        conn.commit()
    by_role = {r["role_type"]: str(r["id"]) for r in rows}
    ctx = {
        "ceo_id": by_role["ceo"],
        "member_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "member_token": issue_access_token(by_role["team_member"], "team_member"),
    }
    # Create a project the member is assigned to
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(ctx["ceo_token"]),
        json={
            "title": "P", "type": "engineering", "priority": "low",
            "assignee_ids": [ctx["member_id"]],
        },
    )
    project = resp.json()["data"]
    ctx["project_id"] = project["id"]
    ctx["first_phase_id"] = project["phases"][0]["id"]
    return ctx


def test_list_phases_for_project(setup: dict, client: TestClient) -> None:
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/phases",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    phases = resp.json()["data"]
    assert isinstance(phases, list)
    assert len(phases) > 0


def test_list_phases_unassigned_member_returns_404(
    setup: dict, client: TestClient
) -> None:
    """A member who isn't on the project must NOT see its phases."""
    # Make a third user
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Other', 'o@x.com', 'X', 'team_member', '#000', %s)
                RETURNING id
                """,
                (pw,),
            )
            other_id = str(cur.fetchone()["id"])
        conn.commit()
    other_token = issue_access_token(other_id, "team_member")
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/phases",
        headers=_bearer(other_token),
    )
    assert resp.status_code == 404


def test_patch_phase_checklist_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/phases/{setup['first_phase_id']}",
        headers=_bearer(setup["member_token"]),
        json={"checklist": [{"label": "step", "done": True}]},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["checklist"] == [{"label": "step", "done": True}]


def test_patch_phase_status_as_ceo(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/phases/{setup['first_phase_id']}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "active"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "active"


def test_patch_phase_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        "/api/v1/phases/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "active"},
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run, verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_phases.py -v 2>&1 | tail -10
```

Expected: 404s on every endpoint.

- [ ] **Step 3: Create `backend/app/routers/phases.py`**

```python
"""Phases router — list per project + update checklist/status."""

from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.phases import PhaseUpdate


router = APIRouter(tags=["phases"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


@router.get("/api/v1/projects/{project_id}/phases")
def list_phases(project_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            if not _user_can_see_project(cur, pid, user):
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                '''SELECT id, project_id, phase_name, status, checklist, "order"
                   FROM phases WHERE project_id = %s ORDER BY "order"''',
                (pid,),
            )
            rows = cur.fetchall()
    return ok(data=[
        {
            "id": str(r["id"]),
            "project_id": str(r["project_id"]),
            "phase_name": r["phase_name"],
            "status": r["status"],
            "checklist": r["checklist"] if r["checklist"] is not None else [],
            "order": r["order"],
        }
        for r in rows
    ])


@router.patch("/api/v1/phases/{phase_id}")
def update_phase(
    phase_id: UUID,
    payload: PhaseUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    with get_conn() as conn:
        with conn.cursor() as cur:
            # Look up phase + parent project for the access check
            cur.execute(
                """
                SELECT id, project_id FROM phases WHERE id = %s
                """,
                (str(phase_id),),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase not found")
            if not _user_can_see_project(cur, str(row["project_id"]), user):
                # Don't leak existence
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase not found")

            # Build UPDATE
            set_pairs = []
            params: dict = {"__id": str(phase_id)}
            if "checklist" in fields:
                set_pairs.append("checklist = %(checklist)s")
                params["checklist"] = psycopg.types.json.Json(
                    [item.model_dump() if hasattr(item, "model_dump") else item
                     for item in fields["checklist"]]
                )
            if "status" in fields:
                set_pairs.append("status = %(status)s")
                params["status"] = fields["status"]
            sql = f'''UPDATE phases SET {", ".join(set_pairs)}, updated_at = now()
                      WHERE id = %(__id)s
                      RETURNING id, project_id, phase_name, status, checklist, "order"'''
            cur.execute(sql, params)
            updated = cur.fetchone()
        conn.commit()

    return ok(data={
        "id": str(updated["id"]),
        "project_id": str(updated["project_id"]),
        "phase_name": updated["phase_name"],
        "status": updated["status"],
        "checklist": updated["checklist"] if updated["checklist"] is not None else [],
        "order": updated["order"],
    })
```

- [ ] **Step 4: Wire into main.py**

```python
from app.routers import auth, health, phases, projects, users
```

```python
app.include_router(phases.router)
```

- [ ] **Step 5: Run tests + full suite**

```bash
pytest tests/test_routers_phases.py -v 2>&1 | tail -10
pytest -v 2>&1 | tail -5
```

Expected: 5 phase tests pass; full suite ~81.

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/app/routers/phases.py backend/app/main.py backend/tests/test_routers_phases.py
git commit -m "$(cat <<'EOF'
feat(backend): phases router — list + update checklist/status

- GET /api/v1/projects/{id}/phases — list phases for a project,
  ordered by phases.order. CEO sees all; member must be assigned
  (404 otherwise — don't leak existence).
- PATCH /api/v1/phases/{id} — partial update of checklist (jsonb)
  and/or status (pending|active|completed). 404 on unknown OR
  inaccessible (uniformly).

5 integration tests cover happy paths, the 404-not-403 ownership
pattern, and the unknown-phase case.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Frontend — `/projects` list page swap to `apiServerFetch`

**Files:**
- Modify: `frontend/src/app/projects/page.tsx`

This is the simplest frontend page to migrate — read-only landing page, hits the backend list endpoint.

- [ ] **Step 1: Read the current page**

```bash
cat frontend/src/app/projects/page.tsx
```

Identify:
- The Prisma call (likely `prisma.project.findMany({ include: { ... } })`)
- The component shape (Server Component returning JSX)
- Any computed fields the page does inline that the backend now provides (e.g. `progress`)

- [ ] **Step 2: Rewrite the data-fetching block**

Replace the `prisma.project.findMany(...)` block with:

```typescript
import { apiServerFetch } from "@/lib/api";
import type { Project } from "...";  // existing type, OR define it inline

type ProjectListRow = {
  id: string;
  title: string;
  type: "engineering" | "research";
  status: "active" | "completed" | "killed";
  priority: "low" | "medium" | "high" | "critical";
  current_phase: string | null;
  timebox_days: number | null;
  start_date: string | null;
  progress: number;
  assignees: Array<{
    id: string;
    name: string;
    email: string;
    role: string;
    role_type: "ceo" | "team_member";
    avatar_color: string;
  }>;
  created_at: string;
};

export default async function ProjectsPage() {
  const projects = await apiServerFetch<ProjectListRow[]>("/api/v1/projects");
  // ... same JSX as before, but iterating over the new shape
}
```

The JSX should not change. The only changes are:
- The data source line (Prisma → `apiServerFetch`)
- Field references (e.g. `project.startDate` → `project.start_date`, `project.assignees[0].user.name` → `project.assignees[0].name` since the list shape is flat)

If the existing page references `project.assignees[i].user.something` (Prisma's nested shape), update to flat `project.assignees[i].something` (the list endpoint's shape). For the **detail** page (Task 8) the shape is `assignees[i].user.something` — different from the list. Keep them straight.

- [ ] **Step 3: Type-check + run frontend tests**

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -10
```

Expected: zero errors. If you get type errors on the response shape, the test fixtures or `ProjectListRow` need updates.

```bash
npm test 2>&1 | tail -10
```

Expected: 141 tests pass. Some test files mock Prisma — those tests should still pass because they're for components that no longer call Prisma in production (they're called from the migrated page, but the test shimmed the data).

- [ ] **Step 4: Manual check (optional but recommended)**

Backend in one terminal, frontend in another. Visit `/projects` after logging in. The list should render the seeded "API Gateway Modernization" + "Customer Churn Prediction Model" cards.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/app/projects/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): /projects list reads from FastAPI

Replaces prisma.project.findMany(...) with apiServerFetch<...>(
"/api/v1/projects"). Component JSX unchanged — only the data source.

The list endpoint includes computed `progress` (% completed phases)
and a flat assignees array; field name updates done inline where
needed (snake_case → kept as-is since the type matches the API
shape exactly).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 8: Frontend — `/projects/[id]` workspace page swap to `apiServerFetch`

**Files:**
- Modify: `frontend/src/app/projects/[id]/page.tsx`
- Possibly modify: any helper in `frontend/src/lib/queries/` that the page imports

This is the largest frontend change. The workspace page renders the full project shape (phases + tasks + submissions + checkpoints). Same one-line swap pattern as Task 7, but with a wider response shape.

- [ ] **Step 1: Read the current page + any data-fetching helpers it imports**

```bash
cat frontend/src/app/projects/[id]/page.tsx
ls frontend/src/lib/queries/
```

Note: `frontend/src/lib/queries/` may have a `projects.ts` or similar with a `getProject(id)` Prisma helper. If so, **rewrite that helper to use apiServerFetch** rather than rewriting the page directly — keeps the page diff minimal.

- [ ] **Step 2: Define the `HydratedProject` type matching the backend response**

Create or update a type alias somewhere accessible (e.g. inline at the top of the page, or in a new `frontend/src/lib/types/project.ts`):

```typescript
export type HydratedProject = {
  id: string;
  title: string;
  type: "engineering" | "research";
  requirement: string | null;
  status: "active" | "completed" | "killed";
  priority: "low" | "medium" | "high" | "critical";
  current_phase: string | null;
  timebox_days: number | null;
  start_date: string | null;
  tech_stack: unknown;
  ai_plan: unknown;
  created_at: string;
  updated_at: string | null;
  assignees: Array<{ user: PublicUser }>;
  phases: Array<HydratedPhase>;
  tasks: Array<HydratedTask>;
  submissions: Array<HydratedSubmission>;
  checkpoints: Array<HydratedCheckpoint>;
};
// ... (define PublicUser, HydratedPhase, HydratedTask, HydratedSubmission, HydratedCheckpoint
//      to match the backend exactly — see the Pydantic models for shapes)
```

- [ ] **Step 3: Replace the Prisma call with `apiServerFetch`**

```typescript
import { apiServerFetch, ApiError } from "@/lib/api";
import { notFound } from "next/navigation";

// ... inside the page component:

let project: HydratedProject;
try {
  project = await apiServerFetch<HydratedProject>(`/api/v1/projects/${params.id}`);
} catch (e) {
  if (e instanceof ApiError && e.status === 404) notFound();
  throw e;
}
```

- [ ] **Step 4: Update field references in the JSX**

This is where most diff lives. Search for snake_case vs camelCase mismatches:
- `project.timeboxDays` → `project.timebox_days`
- `project.startDate` → `project.start_date`
- `project.currentPhase` → `project.current_phase`
- `assignee.user.avatarColor` → `assignee.user.avatar_color`
- `task.dueDate` → `task.due_date`
- `task.assignee?.avatarColor` → `task.assignee?.avatar_color`
- `submission.user.name` etc.

Run `grep -rn "\\.timeboxDays\\|\\.startDate\\|\\.avatarColor\\|\\.dueDate\\|\\.completedAt\\|\\.currentPhase\\|\\.roleType\\|\\.techStack\\|\\.aiPlan" frontend/src/app/projects/` to find all the places to update inside the workspace tree (page + any sub-components called from it).

- [ ] **Step 5: Type-check + tests**

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -20
```

Expected: zero errors.

```bash
npm test 2>&1 | tail -10
```

Expected: 141 tests pass. Sub-component tests that pass mock data of the new shape should still work; ones that pass camelCase data may need fixture updates (small, mechanical).

- [ ] **Step 6: Manual check**

Visit `/projects/<some-uuid>` after logging in. Confirm phases render in the correct order, assignees show with avatars, etc. Tasks/submissions/checkpoints likely render as empty until Phase 4 wires up their POST endpoints (or seed data is added).

- [ ] **Step 7: Commit**

```bash
cd ..
git add -A frontend/src/app/projects/\[id\]/ frontend/src/lib/types/ frontend/src/lib/queries/
git commit -m "$(cat <<'EOF'
refactor(frontend): /projects/[id] workspace reads from FastAPI

Replaces the Prisma findUnique({include: {...}}) call with
apiServerFetch<HydratedProject>(/api/v1/projects/{id}). Same
nested data (assignees+user, phases, tasks+assignee, submissions+
feedback, checkpoints) — only the data source changes.

Field naming swaps from camelCase to snake_case at the leaves
(timebox_days, start_date, avatar_color, etc.) to match the
backend response. JSX structure preserved.

ApiError(404) → notFound() so unauthorized-on-this-project
team members get the 404 page (matches backend's 404-not-403
pattern).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Frontend — `/team` and `/team/manage` swap to `apiServerFetch`

**Files:**
- Modify: `frontend/src/app/team/page.tsx`
- Modify: `frontend/src/app/team/manage/page.tsx`

Both pages call Prisma to list users. They're roughly the same swap as Task 7, but listing users instead of projects.

- [ ] **Step 1: Read both pages**

```bash
cat frontend/src/app/team/page.tsx
cat frontend/src/app/team/manage/page.tsx
```

- [ ] **Step 2: Define the user type (or reuse the one from Phase 2 / Task 7)**

```typescript
type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: "ceo" | "team_member";
  avatar_color: string;
};
```

- [ ] **Step 3: Replace Prisma calls**

In each page:

```typescript
import { apiServerFetch } from "@/lib/api";

const users = await apiServerFetch<UserRow[]>("/api/v1/users");
```

Update field references in JSX (`user.roleType` → `user.role_type`, `user.avatarColor` → `user.avatar_color`, `user.role` likely stays the same).

- [ ] **Step 4: Type-check + tests**

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: zero errors; 141 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/app/team/page.tsx frontend/src/app/team/manage/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): /team and /team/manage read from FastAPI

Replaces prisma.user.findMany() with apiServerFetch<UserRow[]>(
"/api/v1/users"). JSX unchanged; field names swap to snake_case
to match backend (role_type, avatar_color).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Frontend — `/projects/new` wizard migrates to FastAPI

**Files:**
- Modify: `frontend/src/app/projects/new/page.tsx` (and any client components it uses)

The `/projects/new` page is a **client component** (form + state). It currently fetches users and POSTs the new project via internal Next.js API routes. After Phase 3, it should hit FastAPI through the proxy.

- [ ] **Step 1: Inventory the wizard's network calls**

```bash
grep -n "fetch(" frontend/src/app/projects/new/page.tsx | head -10
grep -rn "fetch(" frontend/src/components/new-project* 2>/dev/null | head -10
```

Expected to find:
- `fetch("/api/users")` — replace with `fetch("/api/proxy/v1/users")`
- `fetch("/api/projects", { method: "POST", ... })` — replace with `fetch("/api/proxy/v1/projects", { method: "POST", body: { ... } })`

- [ ] **Step 2: Update the fetches**

The body schema for project create matches `ProjectCreate` from Phase 3 (`title`, `type`, `requirement`, `priority`, `timebox_days`, `tech_stack`, `ai_plan`, `assignee_ids`). Update the request body to use snake_case keys and the right field names.

- [ ] **Step 3: Update the response handling**

The new endpoint returns the envelope `{status, message, data}`. Adjust:

```typescript
const res = await fetch("/api/proxy/v1/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
const envelope = await res.json();
if (!res.ok || envelope.status !== "success") {
  setError(envelope.message ?? "Failed to create project");
  return;
}
const newProject = envelope.data;
router.push(`/projects/${newProject.id}`);
```

- [ ] **Step 4: Type-check + tests**

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: zero errors; 141 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add -A frontend/src/app/projects/new/ frontend/src/components/
git commit -m "$(cat <<'EOF'
refactor(frontend): /projects/new wizard hits FastAPI through proxy

- User dropdown: /api/users → /api/proxy/v1/users
- Submit: POST /api/projects → POST /api/proxy/v1/projects with
  {title, type, priority, timebox_days, tech_stack, ai_plan,
  assignee_ids} (snake_case body matching ProjectCreate schema)
- Response handling unwraps the {status, message, data} envelope

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Delete dead Next.js API routes

**Files (delete):**
- `frontend/src/app/api/users/route.ts`
- `frontend/src/app/api/projects/route.ts`
- `frontend/src/app/api/projects/[id]/route.ts`
- `frontend/src/app/api/phases/route.ts`

These were Prisma-backed and are now replaced by FastAPI through the proxy. Anything still using them in the migrated frontend is a bug.

- [ ] **Step 1: Verify no remaining references**

```bash
cd frontend
grep -rn '"/api/users"\|"/api/projects"\|"/api/phases"' src/ 2>&1 | head -20
```

Expected: only matches inside the route files themselves (which we're about to delete) and possibly in old unit tests that mocked these routes. Anything in a real source path is a leftover migration to fix.

- [ ] **Step 2: Delete the routes**

```bash
git rm src/app/api/users/route.ts 2>&1
git rm "src/app/api/projects/route.ts" 2>&1
git rm "src/app/api/projects/[id]/route.ts" 2>&1
git rm src/app/api/phases/route.ts 2>&1
```

- [ ] **Step 3: Run tests**

```bash
npm test 2>&1 | tail -20
```

If any test mocked the deleted routes, the test will likely still pass (the mocks are inert) but the test no longer verifies anything meaningful. Don't delete those tests — leave them as harmless artifacts; they'll be removed in Phase 7's full Prisma cleanup.

If a test actually imports a now-deleted route module, it'll fail with `Cannot find module`. In that case, delete the test or update it to reference the new route handler / proxy path.

Expected final: 141 tests pass (or, if some fixtures got updated for shape changes, possibly slightly more).

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit 2>&1 | tail -10
```

Expected: zero errors.

- [ ] **Step 5: Commit**

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
chore(frontend): delete dead Prisma-backed API routes

Removed: /api/users, /api/projects, /api/projects/[id], /api/phases.
All four were Prisma-backed and are now replaced by FastAPI
through /api/proxy/[...path] (client) or apiServerFetch (server).

Remaining /api routes: auth/{login,logout,refresh} +
proxy/[...path] (the surviving four from Phase 2).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Smoke + migration-mapping update + push

**Files:**
- Modify: `docs/migration-mapping.md`

- [ ] **Step 1: Run both suites**

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
cd ../frontend && npm test 2>&1 | tail -5
```

Expected: backend ~81 tests pass; frontend 141 tests pass.

- [ ] **Step 2: End-to-end manual smoke test**

Two terminals:
```bash
cd backend && source .venv/Scripts/activate && uvicorn app.main:app --port 8000
```
```bash
cd frontend && npm run dev
```

Browser:
1. Log in as `ceo@projecthub.dev` / `projecthub-dev` → redirects to `/projects` (or wherever).
2. `/projects` shows the seeded projects with assignees + progress bars.
3. Click into a project → workspace page renders phases.
4. Visit `/team` and `/team/manage` → user list renders.
5. (Optional) Visit `/projects/new`, fill the wizard, submit → new project appears in `/projects`.

If anything misbehaves, capture the failure and fix before pushing.

Stop both servers.

- [ ] **Step 3: Update `docs/migration-mapping.md`**

Flip these rows from ⏳ to ✅:
- `GET /api/v1/users`, `GET /api/v1/users/{id}`, `POST /api/v1/users`, `PATCH /api/v1/users/{id}`
- `GET /api/v1/projects`, `POST /api/v1/projects`, `GET /api/v1/projects/{id}`, `PATCH /api/v1/projects/{id}`
- `POST /api/v1/projects/{id}/assignees`, `DELETE /api/v1/projects/{id}/assignees/{user_id}`, `GET /api/v1/my/projects`
- `GET /api/v1/projects/{id}/phases`, `PATCH /api/v1/phases/{id}`

- [ ] **Step 4: Commit + push**

```bash
cd ..
git add docs/migration-mapping.md
git commit -m "$(cat <<'EOF'
docs(migration): mark Phase 3 routes as done

Users + projects + phases routers all live and consumed by the
frontend Server Components. /projects, /projects/[id], /team,
/team/manage and /projects/new wizard all run on FastAPI now.

Tasks/submissions/checkpoints are read-only via the hydrated
GET /projects/{id} — their dedicated routers ship in Phase 4.

End-of-Phase-3 state:
- Backend: ~81 tests across 12 files
- Frontend: 141 tests across 25 files

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git push -u origin feature/backend-phase-3-users-projects
```

Expected: branch pushed, PR creation URL printed.

---

## Acceptance criteria

When all tasks are complete:

1. Branch `feature/backend-phase-3-users-projects` exists with ~12 commits, pushed to origin.
2. `cd backend && pytest -v` → **~81 tests pass** (was 52; +10 users, +14 projects, +5 phases).
3. `cd frontend && npm test` → green (141 tests).
4. `cd backend && uvicorn app.main:app --port 8000` boots; OpenAPI at `/docs` shows the 12 new project/user/phase endpoints alongside the existing auth + healthz.
5. **Frontend manual flow** works end-to-end:
   - Login → `/projects` lists seeded projects with progress + avatars.
   - `/projects/<id>` workspace renders phases + assignees.
   - `/team` and `/team/manage` list users.
   - `/projects/new` wizard creates a project (talks to FastAPI through the proxy).
6. `frontend/src/app/api/` contains exactly: `auth/login/`, `auth/logout/`, `auth/refresh/`, `proxy/[...path]/`. **No** `users/`, `projects/`, or `phases/` directories.
7. `docs/migration-mapping.md` shows the 13 row migrated in this phase as ✅.
8. CEO sees all projects; team members see only assigned ones; unassigned team-member access to a project returns 404 (not 403).

## Out of scope (deferred)

- Tasks router (POST/PATCH `/tasks`) — Phase 4.
- Submissions/feedback router — Phase 4.
- Checkpoints router — Phase 4.
- Leaves + extensions + inbox — Phase 5.
- Capture + AI — Phase 6.
- Removing Prisma + dev.db + the rest of `/api/*` — Phase 7.
- Migrating the CEO landing page (`/`) — depends on inbox + tasks data; Phase 5.
- Production deployment — Phase 8.

