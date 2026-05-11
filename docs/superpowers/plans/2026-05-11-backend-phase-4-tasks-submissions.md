# Backend Phase 4 — Tasks + Submissions + Feedback + Checkpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the **tasks**, **submissions**, **feedback**, and **checkpoints** domain on FastAPI (4 routers, ~12 endpoints), then swap the frontend's **write paths** for these resources to hit FastAPI through `/api/proxy/[...path]`. Reads for these are already covered by Phase 3's hydrated `GET /api/v1/projects/{id}` — Phase 4 fills in the POST/PATCH side.

**Architecture:**
- **Backend** adds 4 routers — `tasks.py` (CRUD + filters + `/my/tasks`), `submissions.py` (CRUD), `feedback.py` (nested under submissions: list + create), `checkpoints.py` (nested under projects: list + create, CEO-only). Pydantic schemas in `app/schemas/{tasks,submissions,feedback,checkpoints}.py`. All four use the same project-ownership rule from Phase 3: CEO sees all; team member must be on the project (404, not 403).
- **Frontend** rewrites client-side `fetch()` calls in the workspace tab components from `/api/tasks/[id]`, `/api/submissions`, `/api/feedback`, `/api/checkpoints` to `/api/proxy/v1/...`. Reads on the workspace page are already covered by Phase 3's hydrated endpoint (the page reloads after a mutation; no manual refetch logic to migrate beyond the mutation call).
- **Cleanup** at end of phase deletes the 4 dead Next.js API routes.

**Tech Stack:** Backend FastAPI + psycopg v3 + raw SQL (no new packages). Frontend: no new packages — uses the existing `/api/proxy/[...path]` plumbing.

**Spec source:** `docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md` — Section 2 router table for tasks/submissions/feedback/checkpoints, Section 6 Phase 4.

**Branch:** `feature/backend-phase-4-tasks-submissions` (cut from `master` at the post-Phase-3 merge commit `b775064`)

---

## Decisions locked

| Topic | Decision | Why |
|---|---|---|
| Filter strategy on `GET /tasks` | Accept optional `project_id`, `phase_id`, `assignee_id` query params; all are ANDed together. Without filters: CEO sees all tasks, member sees only tasks on their assigned projects. | Matches the workspace page's filtered views without overengineering. The OR/IN form can come later if needed. |
| `GET /my/tasks` | Returns tasks where `assignee_id = current_user.user_id`. Includes the task's `project` (id + title) so the UI can group. | Convenience endpoint; same pattern as `/my/projects` from Phase 3. |
| Task status transitions | Endpoint allows any value from the CHECK constraint set (`planning`, `in_progress`, `blocked`, `completed`, `killed`). No state-machine enforcement in v1. | Workspace UI already gates valid transitions; backend just stores. |
| `completed_at` auto-stamp | When `PATCH /tasks/{id}` sets `status = "completed"`, server sets `completed_at = now()` in the same UPDATE. When status changes away from completed, server sets `completed_at = NULL`. | Common task-tracker semantic; keeps frontend code simpler. |
| Submission ownership | Anyone with project access can list/get/create submissions on that project. **No** "you can only edit your own submission" rule — submissions are immutable once created (no PATCH endpoint in v1). | Matches today's behavior; simplest correct model. |
| Feedback ownership | Anyone with submission access can read all feedback and add new feedback. `from_user_id` always = caller. No edit/delete of feedback in v1. | Matches today's behavior. |
| Checkpoint ownership | **CEO-only** for both list and create — checkpoints are CEO project decisions (kill/continue). | Matches Section 2 spec table. |
| Hydrated `GET /projects/{id}` reuse | This phase **does not modify** the projects router. Hydrated reads continue to work as in Phase 3 — they pull tasks/submissions/feedback/checkpoints via raw SQL JOINs from those same tables. | The hydrated read is a query, not a wrapper around the new routers. Phase 3 already correctly assembles it. |
| Frontend writes | Each tab component that posts/patches a resource swaps `fetch("/api/<resource>", ...)` for `fetch("/api/proxy/v1/<resource>", ...)`. Request bodies switch to snake_case where they were camelCase. Response envelope unwrap added. | Same pattern as Phase 3 Task 10 (wizard). |
| Frontend reads after mutation | `router.refresh()` (Next.js) triggers re-render of the Server Component, which re-runs `apiServerFetch` and re-fetches the hydrated project. No client-side cache to invalidate. | Cleanest; already used in Phase 2/3 for similar flows. |
| Tests | Same per-router pattern as Phase 3 — pytest with `client` + `db_clean` fixtures. Each test seeds its own data via a small fixture that creates user + project. | Continues the established pattern. |
| `created_by` on checkpoints | Set to `current_user.user_id` automatically — frontend doesn't need to pass it. | Matches the projects router's `created_by` handling from Phase 3. |
| Task creation defaults | If `status` is omitted, default to `"planning"`. If `assignee_id` is omitted, the task is unassigned. | Sensible UX; UI can offer to assign later. |
| 404 vs 403 | Same Phase 3 pattern: when a team member tries to access a task/submission/feedback/checkpoint they shouldn't see, return 404. When they try to write a CEO-only resource, return 403. | Existence-leakage protection. |

---

## File structure (after this plan)

```
backend/
├── app/
│   ├── main.py                       # MODIFIED — include 4 new routers
│   ├── schemas/
│   │   ├── tasks.py                  # NEW
│   │   ├── submissions.py            # NEW
│   │   ├── feedback.py               # NEW
│   │   └── checkpoints.py            # NEW
│   └── routers/
│       ├── tasks.py                  # NEW — 5 endpoints
│       ├── submissions.py            # NEW — 3 endpoints
│       ├── feedback.py               # NEW — 2 endpoints (nested under submissions)
│       └── checkpoints.py            # NEW — 2 endpoints (nested under projects)
└── tests/
    ├── test_routers_tasks.py         # NEW
    ├── test_routers_submissions.py   # NEW
    ├── test_routers_feedback.py      # NEW
    └── test_routers_checkpoints.py   # NEW

frontend/
├── src/
│   ├── app/
│   │   └── api/
│   │       ├── tasks/[id]/route.ts        # DELETED
│   │       ├── submissions/route.ts       # DELETED
│   │       ├── feedback/route.ts          # DELETED
│   │       └── checkpoints/route.ts       # DELETED
│   └── components/                        # MODIFIED — tab components swap fetches to proxy

docs/
└── migration-mapping.md              # MODIFIED — flip ~12 rows to ✅
```

---

## Tasks

### Task 1: Cut branch + sanity check

**Files:** none.

- [ ] **Step 1: Confirm master is at post-Phase-3 merge**

```bash
cd D:/work-space/task/ProjectHub
git checkout master
git pull origin master
git log -1 --oneline
```

Expected: `b775064 Merge pull request #3 from sathizz7/feature/backend-phase-3-users-projects` (or later).

- [ ] **Step 2: Run both suites**

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
```
Expected: **91 tests pass** across 12 files.

```bash
cd ../frontend && npm test 2>&1 | tail -5
```
Expected: **141 tests pass** across 25 files.

- [ ] **Step 3: Cut the branch**

```bash
cd ..
git checkout -b feature/backend-phase-4-tasks-submissions
```

- [ ] **Step 4: Confirm seed data**

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
        cur.execute('SELECT count(*) AS c FROM phases')
        print('phases:', cur.fetchone()['c'])
"
```

Expected: users ≥ 5, projects ≥ 2, phases > 0.

---

### Task 2: Pydantic schemas — tasks, submissions, feedback, checkpoints

**Files:**
- Create: `backend/app/schemas/tasks.py`
- Create: `backend/app/schemas/submissions.py`
- Create: `backend/app/schemas/feedback.py`
- Create: `backend/app/schemas/checkpoints.py`

No tests for these — the router tests in Tasks 3–6 exercise them end-to-end.

- [ ] **Step 1: Create `backend/app/schemas/tasks.py`**

```python
"""Pydantic models for the tasks router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


TaskStatus = Literal["planning", "in_progress", "blocked", "completed", "killed"]
TaskPriority = Literal["low", "medium", "high", "critical"]


class TaskOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    phase_id: Optional[str] = None
    assignee_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority
    status: TaskStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    phase_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority = "medium"
    status: TaskStatus = "planning"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    phase_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
```

- [ ] **Step 2: Create `backend/app/schemas/submissions.py`**

```python
"""Pydantic models for the submissions router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


SubmissionType = Literal["document", "code", "architecture", "notebook", "demo"]


class SubmissionOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    phase_id: Optional[str] = None
    user_id: str
    title: str
    type: SubmissionType
    description: Optional[str] = None
    link: Optional[str] = None
    created_at: datetime


class SubmissionCreate(BaseModel):
    project_id: str
    phase_id: Optional[str] = None
    title: str
    type: SubmissionType
    description: Optional[str] = None
    link: Optional[str] = None
```

- [ ] **Step 3: Create `backend/app/schemas/feedback.py`**

```python
"""Pydantic models for the feedback router."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FeedbackOut(BaseModel):
    id: str
    submission_id: str
    from_user_id: Optional[str] = None
    text: str
    is_ai: bool
    created_at: datetime


class FeedbackCreate(BaseModel):
    text: str
    is_ai: bool = False
```

- [ ] **Step 4: Create `backend/app/schemas/checkpoints.py`**

```python
"""Pydantic models for the checkpoints router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


CheckpointDecision = Literal["continue", "kill"]


class CheckpointOut(BaseModel):
    id: str
    project_id: str
    decision: CheckpointDecision
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime


class CheckpointCreate(BaseModel):
    decision: CheckpointDecision
    notes: Optional[str] = None
```

- [ ] **Step 5: Smoke check imports**

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
from app.schemas.tasks import TaskOut, TaskCreate, TaskUpdate
from app.schemas.submissions import SubmissionOut, SubmissionCreate
from app.schemas.feedback import FeedbackOut, FeedbackCreate
from app.schemas.checkpoints import CheckpointOut, CheckpointCreate
print('schemas OK')
"
```

Expected: `schemas OK`.

- [ ] **Step 6: Run existing tests to confirm no regression**

```bash
pytest 2>&1 | tail -5
```

Expected: 91 tests pass.

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend/app/schemas/tasks.py backend/app/schemas/submissions.py backend/app/schemas/feedback.py backend/app/schemas/checkpoints.py
git commit -m "$(cat <<'EOF'
feat(backend): pydantic schemas for tasks, submissions, feedback, checkpoints

- schemas/tasks.py: TaskOut, TaskCreate (with defaults), TaskUpdate
- schemas/submissions.py: SubmissionOut, SubmissionCreate
- schemas/feedback.py: FeedbackOut, FeedbackCreate (is_ai default false)
- schemas/checkpoints.py: CheckpointOut, CheckpointCreate
  (decision: continue | kill)

All shapes match the DB columns and the frontend's expected
JSON structure.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `app/routers/tasks.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/tasks.py`
- Create: `backend/tests/test_routers_tasks.py`

Endpoints (all under `/api/v1`):
- `GET /tasks` — list with optional `project_id`/`phase_id`/`assignee_id` query filters. CEO sees all; member scoped to assigned projects.
- `GET /tasks/{id}` — single task. Caller must have access (CEO or project assignee). 404 otherwise.
- `POST /tasks` — create. Authenticated. Caller must have access to the target project (if `project_id` set).
- `PATCH /tasks/{id}` — partial update. Access check. **Auto-sets `completed_at` when status flips to/from `completed`.**
- `GET /my/tasks` — caller's assigned tasks.

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_tasks.py`**

```python
"""Integration tests for /api/v1/tasks."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
def setup(client: TestClient, db_clean: None) -> dict:
    """Seed CEO + member; create a project the member is on."""
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
    return ctx


# ----- POST /tasks -----

def test_create_task_authenticated_with_project_access(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "Do the thing",
            "description": "A test task",
            "project_id": setup["project_id"],
            "assignee_id": setup["member_id"],
            "priority": "high",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["title"] == "Do the thing"
    assert data["status"] == "planning"  # default
    assert data["priority"] == "high"


def test_create_task_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
    """A member NOT on a project can't create a task on it."""
    # Create a separate user not on the project
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
    resp = client.post(
        "/api/v1/tasks",
        headers=_bearer(other_token),
        json={"title": "Sneaky", "project_id": setup["project_id"], "priority": "low"},
    )
    assert resp.status_code == 404


def test_create_task_without_project_id_is_allowed(setup: dict, client: TestClient) -> None:
    """Tasks can be standalone (no project)."""
    resp = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Standalone", "priority": "medium"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["project_id"] is None


# ----- GET /tasks -----

def test_list_tasks_filter_by_project(setup: dict, client: TestClient) -> None:
    # Seed one task on the project
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T1", "project_id": setup["project_id"], "priority": "low"},
    )
    resp = client.get(
        f"/api/v1/tasks?project_id={setup['project_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
    assert all(t["project_id"] == setup["project_id"] for t in data)


def test_list_tasks_filter_by_assignee(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "T1", "project_id": setup["project_id"],
            "assignee_id": setup["member_id"], "priority": "low",
        },
    )
    resp = client.get(
        f"/api/v1/tasks?assignee_id={setup['member_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(t["assignee_id"] == setup["member_id"] for t in data)


def test_list_tasks_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/tasks").status_code == 401


def test_list_tasks_member_scoped(setup: dict, client: TestClient) -> None:
    """A member listing /tasks (no filter) sees only tasks on assigned projects."""
    # CEO creates a project the member is NOT on, plus a task there
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Other", "type": "engineering", "priority": "low"},
    )
    other_pid = resp.json()["data"]["id"]
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Secret", "project_id": other_pid, "priority": "low"},
    )
    # Plus a task on the member's project
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Visible", "project_id": setup["project_id"], "priority": "low"},
    )
    resp = client.get("/api/v1/tasks", headers=_bearer(setup["member_token"]))
    titles = [t["title"] for t in resp.json()["data"]]
    assert "Visible" in titles
    assert "Secret" not in titles


# ----- GET /tasks/{id} -----

def test_get_task_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
    """Member not on the task's project gets 404 — don't leak existence."""
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
    create_resp = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create_resp.json()["data"]["id"]
    resp = client.get(f"/api/v1/tasks/{task_id}", headers=_bearer(other_token))
    assert resp.status_code == 404


def test_get_task_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/tasks/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404


# ----- PATCH /tasks/{id} -----

def test_patch_task_status_to_completed_sets_completed_at(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "completed"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "completed"
    assert data["completed_at"] is not None


def test_patch_task_status_away_from_completed_clears_completed_at(
    setup: dict, client: TestClient
) -> None:
    create = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "completed"},
    )
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "in_progress"},
    )
    data = resp.json()["data"]
    assert data["status"] == "in_progress"
    assert data["completed_at"] is None


def test_patch_task_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
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
    create = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(other_token),
        json={"status": "in_progress"},
    )
    assert resp.status_code == 404


def test_patch_task_empty_body_returns_400(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={},
    )
    assert resp.status_code == 400


# ----- GET /my/tasks -----

def test_my_tasks_returns_only_assigned(setup: dict, client: TestClient) -> None:
    # Task assigned to the member
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "Mine", "project_id": setup["project_id"],
            "assignee_id": setup["member_id"], "priority": "low",
        },
    )
    # Task assigned to the CEO
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "Theirs", "project_id": setup["project_id"],
            "assignee_id": setup["ceo_id"], "priority": "low",
        },
    )
    resp = client.get("/api/v1/my/tasks", headers=_bearer(setup["member_token"]))
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()["data"]]
    assert "Mine" in titles
    assert "Theirs" not in titles
```

- [ ] **Step 2: Run, verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_tasks.py -v 2>&1 | tail -10
```

Expected: 404s on every endpoint.

- [ ] **Step 3: Create `backend/app/routers/tasks.py`**

```python
"""Tasks router — CRUD + filters + /my/tasks."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.tasks import TaskCreate, TaskUpdate


router = APIRouter(tags=["tasks"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _shape_task(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "phase_id": str(r["phase_id"]) if r["phase_id"] else None,
        "assignee_id": str(r["assignee_id"]) if r["assignee_id"] else None,
        "title": r["title"],
        "description": r["description"],
        "due_date": r["due_date"].isoformat() if r["due_date"] else None,
        "priority": r["priority"],
        "status": r["status"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
    }


@router.get("/api/v1/tasks")
def list_tasks(
    project_id: Optional[UUID] = Query(None),
    phase_id: Optional[UUID] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    """Filter by project/phase/assignee. CEO sees all; member scoped to assigned projects."""
    where_clauses = []
    params: list = []
    if project_id is not None:
        where_clauses.append("t.project_id = %s")
        params.append(str(project_id))
    if phase_id is not None:
        where_clauses.append("t.phase_id = %s")
        params.append(str(phase_id))
    if assignee_id is not None:
        where_clauses.append("t.assignee_id = %s")
        params.append(str(assignee_id))

    # Member-scope filter — only tasks on projects they're assigned to OR standalone tasks they're the assignee of
    if user.role_type != "ceo":
        where_clauses.append(
            "(t.project_id IN (SELECT project_id FROM project_assignees WHERE user_id = %s) "
            "OR (t.project_id IS NULL AND t.assignee_id = %s))"
        )
        params.extend([user.user_id, user.user_id])

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, project_id, phase_id, assignee_id, title, description,
               due_date, priority, status, created_at, updated_at, completed_at
        FROM tasks t
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
    return ok(data=[_shape_task(r) for r in rows])


@router.get("/api/v1/my/tasks")
def list_my_tasks(user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, phase_id, assignee_id, title, description,
                       due_date, priority, status, created_at, updated_at, completed_at
                FROM tasks
                WHERE assignee_id = %s
                ORDER BY created_at DESC
                """,
                (user.user_id,),
            )
            rows = cur.fetchall()
    return ok(data=[_shape_task(r) for r in rows])


@router.get("/api/v1/tasks/{task_id}")
def get_task(task_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, phase_id, assignee_id, title, description,
                       due_date, priority, status, created_at, updated_at, completed_at
                FROM tasks WHERE id = %s
                """,
                (str(task_id),),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
            # Access check: must have project access, OR be the assignee on a standalone task
            if row["project_id"] is not None:
                if not _user_can_see_project(cur, str(row["project_id"]), user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
            else:
                if user.role_type != "ceo" and (row["assignee_id"] is None or str(row["assignee_id"]) != user.user_id):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
    return ok(data=_shape_task(row))


@router.post("/api/v1/tasks")
def create_task(payload: TaskCreate, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if payload.project_id is not None:
                # Must have access to the project (CEO always; member if assigned)
                if not _user_can_see_project(cur, payload.project_id, user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO tasks (project_id, phase_id, assignee_id, title, description,
                                   due_date, priority, status)
                VALUES (%(project_id)s, %(phase_id)s, %(assignee_id)s, %(title)s,
                        %(description)s, %(due_date)s, %(priority)s, %(status)s)
                RETURNING id, project_id, phase_id, assignee_id, title, description,
                          due_date, priority, status, created_at, updated_at, completed_at
                """,
                {
                    "project_id": payload.project_id,
                    "phase_id": payload.phase_id,
                    "assignee_id": payload.assignee_id,
                    "title": payload.title,
                    "description": payload.description,
                    "due_date": payload.due_date,
                    "priority": payload.priority,
                    "status": payload.status,
                },
            )
            row = cur.fetchone()
        conn.commit()
    return ok(data=_shape_task(row), message="Created")


@router.patch("/api/v1/tasks/{task_id}")
def update_task(
    task_id: UUID, payload: TaskUpdate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, project_id FROM tasks WHERE id = %s",
                (str(task_id),),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
            if row["project_id"] is not None:
                if not _user_can_see_project(cur, str(row["project_id"]), user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")

            # Build SET clauses
            set_pairs = []
            params: dict = {"__id": str(task_id)}
            for key, value in fields.items():
                set_pairs.append(f"{key} = %({key})s")
                params[key] = value

            # Auto-stamp completed_at on status transitions
            if "status" in fields:
                if fields["status"] == "completed":
                    set_pairs.append("completed_at = now()")
                else:
                    set_pairs.append("completed_at = NULL")

            sql = (
                f"UPDATE tasks SET {', '.join(set_pairs)}, updated_at = now() "
                f"WHERE id = %(__id)s "
                f"RETURNING id, project_id, phase_id, assignee_id, title, description, "
                f"          due_date, priority, status, created_at, updated_at, completed_at"
            )
            cur.execute(sql, params)
            updated = cur.fetchone()
        conn.commit()
    return ok(data=_shape_task(updated))
```

- [ ] **Step 4: Wire into `backend/app/main.py`**

Update the import:
```python
from app.routers import auth, health, phases, projects, tasks, users
```

After `app.include_router(phases.router)`, add:
```python
app.include_router(tasks.router)
```

- [ ] **Step 5: Run tests**

```bash
pytest tests/test_routers_tasks.py -v 2>&1 | tail -25
```

Expected: ~12 tests pass.

- [ ] **Step 6: Run full backend suite**

```bash
pytest -v 2>&1 | tail -10
```

Expected: 103 tests pass (91 + 12).

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend/app/routers/tasks.py backend/app/main.py backend/tests/test_routers_tasks.py
git commit -m "$(cat <<'EOF'
feat(backend): tasks router — CRUD + filters + /my/tasks

- GET /api/v1/tasks — list with optional project_id, phase_id,
  assignee_id query filters. CEO sees all; member scoped to
  assigned projects + own standalone tasks.
- GET /api/v1/tasks/{id} — 404 on unknown OR on inaccessible
  (don't leak existence).
- POST /api/v1/tasks — authenticated; if project_id is set,
  caller must have access. Defaults: status='planning',
  priority='medium'.
- PATCH /api/v1/tasks/{id} — partial update; access check.
  Auto-stamps completed_at on status='completed'; clears it
  when status moves away. 400 on empty body.
- GET /api/v1/my/tasks — tasks where assignee_id = caller.

12 integration tests cover CRUD, filters, scoping, ownership 404,
the completed_at auto-stamp/clear, and the empty-body rejection.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `app/routers/submissions.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/submissions.py`
- Create: `backend/tests/test_routers_submissions.py`

Endpoints:
- `GET /api/v1/submissions` — list with optional `project_id`/`phase_id`/`user_id` query filters. Scoped to caller's accessible projects.
- `GET /api/v1/submissions/{id}` — single. Access check via parent project.
- `POST /api/v1/submissions` — create. Authenticated. Caller must have access to the target project. `user_id` is always set to caller.

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_submissions.py`**

```python
"""Integration tests for /api/v1/submissions."""

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


def test_create_submission_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["member_token"]),
        json={
            "project_id": setup["project_id"],
            "phase_id": setup["first_phase_id"],
            "title": "My doc",
            "type": "document",
            "link": "https://example.com/doc",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["title"] == "My doc"
    assert data["user_id"] == setup["member_id"]


def test_create_submission_unassigned_member_returns_404(
    setup: dict, client: TestClient
) -> None:
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
    resp = client.post(
        "/api/v1/submissions",
        headers=_bearer(other_token),
        json={"project_id": setup["project_id"], "title": "S", "type": "code"},
    )
    assert resp.status_code == 404


def test_list_submissions_filter_by_project(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "S1", "type": "code"},
    )
    resp = client.get(
        f"/api/v1/submissions?project_id={setup['project_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(s["project_id"] == setup["project_id"] for s in data)


def test_list_submissions_member_scoped(setup: dict, client: TestClient) -> None:
    """A member listing submissions sees only those on assigned projects."""
    # CEO creates a different project (member not assigned)
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Other", "type": "engineering", "priority": "low"},
    )
    other_pid = resp.json()["data"]["id"]
    client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": other_pid, "title": "Secret", "type": "document"},
    )
    client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "Visible", "type": "document"},
    )
    resp = client.get("/api/v1/submissions", headers=_bearer(setup["member_token"]))
    titles = [s["title"] for s in resp.json()["data"]]
    assert "Visible" in titles
    assert "Secret" not in titles


def test_get_submission_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
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
    create = client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "S", "type": "code"},
    )
    sid = create.json()["data"]["id"]
    resp = client.get(f"/api/v1/submissions/{sid}", headers=_bearer(other_token))
    assert resp.status_code == 404


def test_get_submission_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/submissions/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404


def test_list_submissions_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/submissions").status_code == 401
```

- [ ] **Step 2: Run, verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_submissions.py -v 2>&1 | tail -10
```

Expected: 404s.

- [ ] **Step 3: Create `backend/app/routers/submissions.py`**

```python
"""Submissions router — list/get/create."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.submissions import SubmissionCreate


router = APIRouter(prefix="/api/v1/submissions", tags=["submissions"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _shape_submission(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "phase_id": str(r["phase_id"]) if r["phase_id"] else None,
        "user_id": str(r["user_id"]),
        "title": r["title"],
        "type": r["type"],
        "description": r["description"],
        "link": r["link"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


@router.get("")
def list_submissions(
    project_id: Optional[UUID] = Query(None),
    phase_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    where_clauses = []
    params: list = []
    if project_id is not None:
        where_clauses.append("s.project_id = %s")
        params.append(str(project_id))
    if phase_id is not None:
        where_clauses.append("s.phase_id = %s")
        params.append(str(phase_id))
    if user_id is not None:
        where_clauses.append("s.user_id = %s")
        params.append(str(user_id))

    if user.role_type != "ceo":
        where_clauses.append(
            "s.project_id IN (SELECT project_id FROM project_assignees WHERE user_id = %s)"
        )
        params.append(user.user_id)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, project_id, phase_id, user_id, title, type, description, link, created_at
        FROM submissions s
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
    return ok(data=[_shape_submission(r) for r in rows])


@router.get("/{submission_id}")
def get_submission(submission_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, phase_id, user_id, title, type, description, link, created_at
                FROM submissions WHERE id = %s
                """,
                (str(submission_id),),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
            if row["project_id"] is not None and not _user_can_see_project(
                cur, str(row["project_id"]), user
            ):
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return ok(data=_shape_submission(row))


@router.post("")
def create_submission(
    payload: SubmissionCreate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if not _user_can_see_project(cur, payload.project_id, user):
                # Don't leak project existence
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO submissions (project_id, phase_id, user_id, title, type, description, link)
                VALUES (%(project_id)s, %(phase_id)s, %(user_id)s, %(title)s,
                        %(type)s, %(description)s, %(link)s)
                RETURNING id, project_id, phase_id, user_id, title, type, description, link, created_at
                """,
                {
                    "project_id": payload.project_id,
                    "phase_id": payload.phase_id,
                    "user_id": user.user_id,
                    "title": payload.title,
                    "type": payload.type,
                    "description": payload.description,
                    "link": payload.link,
                },
            )
            row = cur.fetchone()
        conn.commit()
    return ok(data=_shape_submission(row), message="Created")
```

- [ ] **Step 4: Wire into `backend/app/main.py`**

Update import:
```python
from app.routers import auth, health, phases, projects, submissions, tasks, users
```

After `app.include_router(tasks.router)`, add:
```python
app.include_router(submissions.router)
```

- [ ] **Step 5: Run tests + full suite**

```bash
pytest tests/test_routers_submissions.py -v 2>&1 | tail -15
pytest -v 2>&1 | tail -5
```

Expected: 7 submissions tests pass; full suite 110 (103 + 7).

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/app/routers/submissions.py backend/app/main.py backend/tests/test_routers_submissions.py
git commit -m "$(cat <<'EOF'
feat(backend): submissions router — list/get/create

- GET /api/v1/submissions — list with optional project_id /
  phase_id / user_id filters. CEO sees all; member scoped to
  assigned projects.
- GET /api/v1/submissions/{id} — 404 on unknown OR on
  inaccessible.
- POST /api/v1/submissions — authenticated; caller must have
  access to the target project (404 if not). user_id is always
  set to caller.

7 integration tests cover create, list with filter, list scoping,
get with ownership 404, unknown 404, and unauthenticated 401.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `app/routers/feedback.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/feedback.py`
- Create: `backend/tests/test_routers_feedback.py`

Endpoints:
- `GET /api/v1/submissions/{submission_id}/feedback` — list feedback on a submission. Access via parent submission's project.
- `POST /api/v1/submissions/{submission_id}/feedback` — create. Caller must have access to the submission. `from_user_id` always = caller.

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_feedback.py`**

```python
"""Integration tests for /api/v1/submissions/{id}/feedback."""

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
    create = client.post(
        "/api/v1/submissions",
        headers=_bearer(ctx["ceo_token"]),
        json={"project_id": ctx["project_id"], "title": "S", "type": "document"},
    )
    ctx["submission_id"] = create.json()["data"]["id"]
    return ctx


def test_create_feedback_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["member_token"]),
        json={"text": "Looks good"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["text"] == "Looks good"
    assert data["from_user_id"] == setup["member_id"]
    assert data["is_ai"] is False


def test_create_feedback_ai_flag(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["ceo_token"]),
        json={"text": "AI says hi", "is_ai": True},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_ai"] is True


def test_create_feedback_unassigned_member_returns_404(
    setup: dict, client: TestClient
) -> None:
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
    resp = client.post(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(other_token),
        json={"text": "Sneaky"},
    )
    assert resp.status_code == 404


def test_list_feedback_for_submission(setup: dict, client: TestClient) -> None:
    client.post(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["ceo_token"]),
        json={"text": "First feedback"},
    )
    resp = client.get(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
    assert data[0]["text"] == "First feedback"


def test_list_feedback_unknown_submission_returns_404(
    setup: dict, client: TestClient
) -> None:
    resp = client.get(
        "/api/v1/submissions/00000000-0000-0000-0000-000000000000/feedback",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run, verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_feedback.py -v 2>&1 | tail -10
```

Expected: 404s.

- [ ] **Step 3: Create `backend/app/routers/feedback.py`**

```python
"""Feedback router — nested under submissions; list + create."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.feedback import FeedbackCreate


router = APIRouter(tags=["feedback"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _user_can_see_submission(cur, submission_id: str, user: CurrentUser) -> tuple[bool, dict | None]:
    """Return (allowed, submission_row). Submission must exist."""
    cur.execute(
        "SELECT id, project_id FROM submissions WHERE id = %s",
        (submission_id,),
    )
    row = cur.fetchone()
    if row is None:
        return False, None
    if row["project_id"] is None:
        # Standalone submission; only CEO can access for now
        return user.role_type == "ceo", row
    return _user_can_see_project(cur, str(row["project_id"]), user), row


def _shape_feedback(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "submission_id": str(r["submission_id"]),
        "from_user_id": str(r["from_user_id"]) if r["from_user_id"] else None,
        "text": r["text"],
        "is_ai": r["is_ai"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


@router.get("/api/v1/submissions/{submission_id}/feedback")
def list_feedback(submission_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            allowed, row = _user_can_see_submission(cur, str(submission_id), user)
            if row is None or not allowed:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
            cur.execute(
                """
                SELECT id, submission_id, from_user_id, text, is_ai, created_at
                FROM feedback WHERE submission_id = %s
                ORDER BY created_at
                """,
                (str(submission_id),),
            )
            rows = cur.fetchall()
    return ok(data=[_shape_feedback(r) for r in rows])


@router.post("/api/v1/submissions/{submission_id}/feedback")
def create_feedback(
    submission_id: UUID,
    payload: FeedbackCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            allowed, row = _user_can_see_submission(cur, str(submission_id), user)
            if row is None or not allowed:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
            cur.execute(
                """
                INSERT INTO feedback (submission_id, from_user_id, text, is_ai)
                VALUES (%s, %s, %s, %s)
                RETURNING id, submission_id, from_user_id, text, is_ai, created_at
                """,
                (str(submission_id), user.user_id, payload.text, payload.is_ai),
            )
            new_row = cur.fetchone()
        conn.commit()
    return ok(data=_shape_feedback(new_row), message="Created")
```

- [ ] **Step 4: Wire into `backend/app/main.py`**

Update import:
```python
from app.routers import auth, feedback, health, phases, projects, submissions, tasks, users
```

After `app.include_router(submissions.router)`, add:
```python
app.include_router(feedback.router)
```

- [ ] **Step 5: Run tests + full suite**

```bash
pytest tests/test_routers_feedback.py -v 2>&1 | tail -15
pytest -v 2>&1 | tail -5
```

Expected: 5 feedback tests pass; full suite 115 (110 + 5).

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/app/routers/feedback.py backend/app/main.py backend/tests/test_routers_feedback.py
git commit -m "$(cat <<'EOF'
feat(backend): feedback router — nested under submissions

- GET /api/v1/submissions/{id}/feedback — list; access check via
  parent submission's project. 404 on unknown OR inaccessible.
- POST /api/v1/submissions/{id}/feedback — authenticated; access
  check via parent project. from_user_id always = caller. is_ai
  defaults to false; can be set true (for AI-generated feedback in
  Phase 6).

5 integration tests cover create as assigned member, create with
is_ai flag, ownership 404, list, and unknown-submission 404.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: `app/routers/checkpoints.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/checkpoints.py`
- Create: `backend/tests/test_routers_checkpoints.py`

Endpoints:
- `GET /api/v1/projects/{project_id}/checkpoints` — list. CEO-only.
- `POST /api/v1/projects/{project_id}/checkpoints` — create. CEO-only. `created_by` always = caller.

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_checkpoints.py`**

```python
"""Integration tests for /api/v1/projects/{id}/checkpoints."""

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
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(ctx["ceo_token"]),
        json={
            "title": "P", "type": "engineering", "priority": "low",
            "assignee_ids": [ctx["member_id"]],
        },
    )
    ctx["project_id"] = resp.json()["data"]["id"]
    return ctx


def test_create_checkpoint_as_ceo(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["ceo_token"]),
        json={"decision": "continue", "notes": "Looking good"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["decision"] == "continue"
    assert data["created_by"] == setup["ceo_id"]


def test_create_checkpoint_as_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["member_token"]),
        json={"decision": "kill", "notes": "..."},
    )
    assert resp.status_code == 403


def test_create_checkpoint_unknown_project_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/checkpoints",
        headers=_bearer(setup["ceo_token"]),
        json={"decision": "continue"},
    )
    assert resp.status_code == 404


def test_list_checkpoints_as_ceo(setup: dict, client: TestClient) -> None:
    client.post(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["ceo_token"]),
        json={"decision": "continue", "notes": "n1"},
    )
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1


def test_list_checkpoints_as_member_forbidden(setup: dict, client: TestClient) -> None:
    """List endpoint is CEO-only per spec."""
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["member_token"]),
    )
    assert resp.status_code == 403


def test_list_checkpoints_unknown_project_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/checkpoints",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404
```

- [ ] **Step 2: Run, verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_checkpoints.py -v 2>&1 | tail -10
```

Expected: 404s.

- [ ] **Step 3: Create `backend/app/routers/checkpoints.py`**

```python
"""Checkpoints router — nested under projects; CEO-only."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.checkpoints import CheckpointCreate


router = APIRouter(tags=["checkpoints"])


def _shape_checkpoint(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]),
        "decision": r["decision"],
        "notes": r["notes"],
        "created_by": str(r["created_by"]) if r["created_by"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


@router.get(
    "/api/v1/projects/{project_id}/checkpoints",
    dependencies=[Depends(require_roles("ceo"))],
)
def list_checkpoints(project_id: UUID) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                SELECT id, project_id, decision, notes, created_by, created_at
                FROM checkpoints WHERE project_id = %s
                ORDER BY created_at DESC
                """,
                (pid,),
            )
            rows = cur.fetchall()
    return ok(data=[_shape_checkpoint(r) for r in rows])


@router.post(
    "/api/v1/projects/{project_id}/checkpoints",
    dependencies=[Depends(require_roles("ceo"))],
)
def create_checkpoint(
    project_id: UUID,
    payload: CheckpointCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO checkpoints (project_id, decision, notes, created_by)
                VALUES (%s, %s, %s, %s)
                RETURNING id, project_id, decision, notes, created_by, created_at
                """,
                (pid, payload.decision, payload.notes, user.user_id),
            )
            new_row = cur.fetchone()
        conn.commit()
    return ok(data=_shape_checkpoint(new_row), message="Created")
```

- [ ] **Step 4: Wire into `backend/app/main.py`**

Update import:
```python
from app.routers import (
    auth, checkpoints, feedback, health, phases, projects, submissions, tasks, users,
)
```

After `app.include_router(feedback.router)`, add:
```python
app.include_router(checkpoints.router)
```

- [ ] **Step 5: Run tests + full suite**

```bash
pytest tests/test_routers_checkpoints.py -v 2>&1 | tail -15
pytest -v 2>&1 | tail -5
```

Expected: 6 checkpoints tests pass; full suite 121 (115 + 6).

- [ ] **Step 6: Commit**

```bash
cd ..
git add backend/app/routers/checkpoints.py backend/app/main.py backend/tests/test_routers_checkpoints.py
git commit -m "$(cat <<'EOF'
feat(backend): checkpoints router — list/create (CEO-only)

- GET /api/v1/projects/{id}/checkpoints — CEO-only. 404 on
  unknown project; 403 for team members.
- POST /api/v1/projects/{id}/checkpoints — CEO-only.
  created_by always = caller. 404 on unknown project.

6 integration tests cover create, list, ceo-only 403 on member
attempts (both list and create), and unknown-project 404 on both.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Backend smoke test — exercise all 4 new routers

**Files:** none.

- [ ] **Step 1: Boot uvicorn**

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --port 8000 &
UVICORN_PID=$!
sleep 4
```

- [ ] **Step 2: Login as CEO + get a project_id**

```bash
LOGIN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ceo@projecthub.dev","password":"projecthub-dev"}')
ACCESS=$(echo "$LOGIN" | python -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
PROJECT_ID=$(curl -s http://localhost:8000/api/v1/projects \
    -H "Authorization: Bearer $ACCESS" \
    | python -c "import sys,json; print(json.load(sys.stdin)['data'][0]['id'])")
echo "Logged in. project_id=$PROJECT_ID"
```

- [ ] **Step 3: Create + list a task**

```bash
TASK=$(curl -s -X POST http://localhost:8000/api/v1/tasks \
    -H "Authorization: Bearer $ACCESS" \
    -H "Content-Type: application/json" \
    -d "{\"title\":\"Smoke task\",\"project_id\":\"$PROJECT_ID\",\"priority\":\"high\"}")
echo "$TASK" | python -m json.tool | head -20
TASK_ID=$(echo "$TASK" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
curl -s "http://localhost:8000/api/v1/tasks?project_id=$PROJECT_ID" \
    -H "Authorization: Bearer $ACCESS" | python -c "import sys,json; print(len(json.load(sys.stdin)['data']),'tasks')"
```

- [ ] **Step 4: Complete the task (auto-stamps completed_at)**

```bash
curl -s -X PATCH "http://localhost:8000/api/v1/tasks/$TASK_ID" \
    -H "Authorization: Bearer $ACCESS" \
    -H "Content-Type: application/json" \
    -d '{"status":"completed"}' | python -m json.tool | head -15
```

Expect `completed_at` is non-null.

- [ ] **Step 5: Create + list a submission**

```bash
SUB=$(curl -s -X POST http://localhost:8000/api/v1/submissions \
    -H "Authorization: Bearer $ACCESS" \
    -H "Content-Type: application/json" \
    -d "{\"project_id\":\"$PROJECT_ID\",\"title\":\"Smoke sub\",\"type\":\"document\"}")
SUB_ID=$(echo "$SUB" | python -c "import sys,json; print(json.load(sys.stdin)['data']['id'])")
echo "submission_id=$SUB_ID"
```

- [ ] **Step 6: Add feedback to the submission**

```bash
curl -s -X POST "http://localhost:8000/api/v1/submissions/$SUB_ID/feedback" \
    -H "Authorization: Bearer $ACCESS" \
    -H "Content-Type: application/json" \
    -d '{"text":"Looks good"}' | python -m json.tool | head -10
curl -s "http://localhost:8000/api/v1/submissions/$SUB_ID/feedback" \
    -H "Authorization: Bearer $ACCESS" | python -c "import sys,json; print(len(json.load(sys.stdin)['data']),'feedback')"
```

- [ ] **Step 7: Create a checkpoint**

```bash
curl -s -X POST "http://localhost:8000/api/v1/projects/$PROJECT_ID/checkpoints" \
    -H "Authorization: Bearer $ACCESS" \
    -H "Content-Type: application/json" \
    -d '{"decision":"continue","notes":"All good"}' | python -m json.tool | head -10
```

- [ ] **Step 8: Stop uvicorn, no commit**

```bash
kill $UVICORN_PID 2>/dev/null
wait 2>/dev/null
cd ..
```

This task verifies all four routers work end-to-end. No commit — verification only.

---

### Task 8: Frontend — rewrite task mutation calls to use the proxy

**Files:**
- Modify: any frontend file that calls `/api/tasks/[id]` (legacy Prisma-backed PATCH)

- [ ] **Step 1: Inventory current task fetches**

```bash
cd frontend
grep -rn '"/api/tasks/' src/ 2>&1 | grep -v "__tests__" | head -10
grep -rn "/api/tasks" src/components/ 2>&1 | grep -v "__tests__" | head -10
```

- [ ] **Step 2: Rewrite each call to use the proxy**

For PATCHing a task:
```typescript
// Before
fetch(`/api/tasks/${taskId}`, { method: "PATCH", body: JSON.stringify({ status }) });

// After
const res = await fetch(`/api/proxy/v1/tasks/${taskId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status }),
});
const envelope = await res.json();
if (!res.ok || envelope.status !== "success") {
  // surface envelope.message
}
```

For POSTing a new task (if any UI does this):
```typescript
const res = await fetch("/api/proxy/v1/tasks", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    title,
    description,
    project_id: projectId,
    phase_id: phaseId,
    assignee_id: assigneeId,
    due_date: dueDate,    // ISO 8601 string
    priority,
    status,
  }),
});
```

Common renames:
- `taskId` → path param (no key change)
- `dueDate` → `due_date` (request body)
- `assigneeId` → `assignee_id`
- `phaseId` → `phase_id`
- `projectId` → `project_id`

- [ ] **Step 3: After every mutation, refresh the page**

```typescript
import { useRouter } from "next/navigation";
// inside the component
const router = useRouter();
// after a successful PATCH/POST:
router.refresh();
```

This triggers Next.js to re-render the Server Component (workspace page), which re-runs `apiServerFetch` and pulls the updated hydrated project.

- [ ] **Step 4: Type-check + run frontend tests**

```bash
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: zero errors, 141 tests pass. If a test breaks, it's likely a sub-component fixture; update it minimally.

- [ ] **Step 5: Commit**

```bash
cd ..
git add -A frontend/src/components/ frontend/src/app/
git status --short backend/ docs/  # nothing should be staged from backend/docs
git commit -m "$(cat <<'EOF'
refactor(frontend): task mutations hit FastAPI through proxy

Replaces fetch("/api/tasks/...") (Prisma-backed) with
fetch("/api/proxy/v1/tasks/...") for PATCH (status change,
assignee change, etc.) and POST (new task) — wherever the
workspace tabs trigger task mutations.

Request bodies switched to snake_case (assignee_id, due_date,
phase_id, project_id). Response envelopes unwrapped.

router.refresh() called after each successful mutation so the
Server Component re-renders with fresh hydrated project data.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Frontend — rewrite submission + feedback mutation calls

**Files:**
- Modify: any frontend file that calls `/api/submissions` or `/api/feedback`

- [ ] **Step 1: Inventory**

```bash
cd frontend
grep -rn '"/api/submissions"\|"/api/feedback"' src/ 2>&1 | grep -v "__tests__"
```

- [ ] **Step 2: Rewrite POST /api/submissions**

```typescript
const res = await fetch("/api/proxy/v1/submissions", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    project_id: projectId,
    phase_id: phaseId,    // optional
    title,
    type,                  // "document" | "code" | "architecture" | "notebook" | "demo"
    description,           // optional
    link,                  // optional
  }),
});
const envelope = await res.json();
if (!res.ok || envelope.status !== "success") {
  // surface envelope.message
}
router.refresh();
```

- [ ] **Step 3: Rewrite POST /api/feedback**

Note the path change: feedback is now nested under the submission.

```typescript
const res = await fetch(`/api/proxy/v1/submissions/${submissionId}/feedback`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    text: feedbackText,
    is_ai: false,    // or true for AI feedback
  }),
});
```

- [ ] **Step 4: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: zero errors; 141 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
refactor(frontend): submission + feedback mutations through proxy

- POST /api/submissions → POST /api/proxy/v1/submissions
  (body keys: project_id, phase_id, title, type, description, link)
- POST /api/feedback → POST /api/proxy/v1/submissions/{id}/feedback
  (feedback is now nested under the submission; body: text, is_ai)

Response envelopes unwrapped. router.refresh() after each
successful mutation so the workspace re-renders.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Frontend — rewrite checkpoint mutation calls

**Files:**
- Modify: any frontend file that calls `/api/checkpoints`

- [ ] **Step 1: Inventory**

```bash
cd frontend
grep -rn '"/api/checkpoints"' src/ 2>&1 | grep -v "__tests__"
```

- [ ] **Step 2: Rewrite POST /api/checkpoints**

Path change: checkpoints are now nested under the project.

```typescript
const res = await fetch(`/api/proxy/v1/projects/${projectId}/checkpoints`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    decision,    // "continue" | "kill"
    notes,       // optional
  }),
});
const envelope = await res.json();
if (!res.ok || envelope.status !== "success") {
  // surface envelope.message (likely 403 for non-CEO)
}
router.refresh();
```

- [ ] **Step 3: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: zero errors; 141 tests pass.

- [ ] **Step 4: Commit**

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
refactor(frontend): checkpoint mutations through proxy

POST /api/checkpoints → POST /api/proxy/v1/projects/{id}/checkpoints

Checkpoints are now nested under the project in the API path.
CEO-only on the backend (403 for team members) — surface the
envelope message on failure.

router.refresh() after success so the workspace re-renders with
the new checkpoint in the checkpoints tab.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Delete dead Next.js API routes

**Files (delete, if they exist):**
- `frontend/src/app/api/tasks/[id]/route.ts`
- `frontend/src/app/api/submissions/route.ts`
- `frontend/src/app/api/feedback/route.ts`
- `frontend/src/app/api/checkpoints/route.ts`

- [ ] **Step 1: Verify no remaining references**

```bash
cd frontend
grep -rn '"/api/tasks/\|"/api/submissions"\|"/api/feedback"\|"/api/checkpoints"' src/ 2>&1 | head -20
```

Expected: empty (or only inside the route files we're about to delete + maybe test mocks).

If a real source file still calls these, **stop and fix** before deleting.

- [ ] **Step 2: Delete the routes**

```bash
git rm "src/app/api/tasks/[id]/route.ts" 2>&1 || echo "(already gone)"
git rm src/app/api/submissions/route.ts 2>&1 || echo "(already gone)"
git rm src/app/api/feedback/route.ts 2>&1 || echo "(already gone)"
git rm src/app/api/checkpoints/route.ts 2>&1 || echo "(already gone)"
```

- [ ] **Step 3: Look for orphaned tests**

```bash
grep -rn "@/app/api/tasks\|@/app/api/submissions\|@/app/api/feedback\|@/app/api/checkpoints" src/ 2>&1 | head -10
```

If a test imports a deleted module, decide: update the test or delete it.

- [ ] **Step 4: Type-check + tests**

```bash
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: zero errors; 141 tests pass.

- [ ] **Step 5: Commit**

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
chore(frontend): delete dead Prisma-backed API routes

Removed (where present):
- /api/tasks/[id]
- /api/submissions
- /api/feedback
- /api/checkpoints

All four were Prisma-backed and have been replaced by FastAPI
through /api/proxy/[...path].

Remaining /api routes after Phase 4:
- auth/login, auth/logout, auth/refresh (Phase 2)
- proxy/[...path] (Phase 2)
- ai/, capture/, deadline-extensions/, leave-requests/ (Phases 5-6)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: E2E smoke + migration-mapping + push

**Files:**
- Modify: `docs/migration-mapping.md`

- [ ] **Step 1: Run both suites**

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
cd ../frontend && npm test 2>&1 | tail -5
```

Expected: backend 121, frontend 141.

- [ ] **Step 2: End-to-end manual smoke**

Two terminals:
```bash
cd backend && source .venv/Scripts/activate && uvicorn app.main:app --port 8000
```
```bash
cd frontend && npm run dev
```

Browser flow:
1. Log in as `ceo@projecthub.dev` / `projecthub-dev`.
2. Visit `/projects/<some-id>` workspace.
3. **Tasks tab**: create a new task → see it appear. Change status → see it move/get a completed_at. Verify the task list updates.
4. **Submissions tab**: add a new submission → see it appear under the right phase. Add feedback to it → see the feedback appear. Verify feedback persists on reload.
5. **Checkpoints tab** (CEO only): add a checkpoint → see it appear. As a team member, the form should be hidden or 403 should surface.
6. **Phases tab** (Phase 3, unchanged): toggle checklist items → still works. Advance phase → still works.

If any step fails, capture the symptom and fix before pushing.

Stop both servers.

- [ ] **Step 3: Update `docs/migration-mapping.md`**

Flip these rows from ⏳ to ✅:
- `GET /api/v1/tasks`, `GET /api/v1/tasks/{id}`, `POST /api/v1/tasks`, `PATCH /api/v1/tasks/{id}`, `GET /api/v1/my/tasks`
- `GET /api/v1/submissions`, `POST /api/v1/submissions`, `GET /api/v1/submissions/{id}`
- `GET /api/v1/submissions/{id}/feedback`, `POST /api/v1/submissions/{id}/feedback`
- `GET /api/v1/projects/{id}/checkpoints`, `POST /api/v1/projects/{id}/checkpoints`

- [ ] **Step 4: Commit + push**

```bash
cd ..
git add docs/migration-mapping.md
git commit -m "$(cat <<'EOF'
docs(migration): mark Phase 4 routes as done

Tasks, submissions, feedback, and checkpoints routers all live and
consumed by the frontend workspace tabs through /api/proxy/[...path].

End-of-Phase-4 state:
- Backend: 121 tests across 16 files
- Frontend: 141 tests across 25 files
- Migrated mutation paths: tasks (POST/PATCH), submissions (POST),
  feedback (POST), checkpoints (POST)
- Deleted Next.js routes: /api/tasks/[id], /api/submissions,
  /api/feedback, /api/checkpoints (all Prisma-backed)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git push -u origin feature/backend-phase-4-tasks-submissions
```

---

## Acceptance criteria

When all tasks are complete:

1. Branch `feature/backend-phase-4-tasks-submissions` exists with ~12 commits, pushed to origin.
2. `cd backend && pytest -v` → **121 tests pass** (was 91; +12 tasks, +7 submissions, +5 feedback, +6 checkpoints).
3. `cd frontend && npm test` → 141 tests pass.
4. `cd backend && uvicorn app.main:app --port 8000` boots; OpenAPI shows the 12 new endpoints alongside existing.
5. **Manual workspace flow works**: tasks (create/update/complete), submissions (create + feedback), checkpoints (CEO create).
6. `frontend/src/app/api/` contains: `auth/`, `proxy/`, `ai/`, `capture/`, `deadline-extensions/`, `leave-requests/` — the four Phase 4 directories are gone.
7. `docs/migration-mapping.md` has 12 newly-✅ rows.
8. CEO sees all; team members are project-scoped; CEO-only writes are enforced (403 for non-CEO on checkpoints).

## Out of scope (deferred)

- Leaves + extensions + inbox — Phase 5.
- Capture + AI — Phase 6.
- Removing Prisma + dev.db + rest of `/api/*` — Phase 7.
- The CEO landing page (`/`) — Phase 5 (depends on inbox + tasks aggregations).
- Submission **update/delete** — out of scope entirely; submissions are immutable in v1.
- Feedback **update/delete** — out of scope; feedback is immutable in v1.
- Task state-machine enforcement — backend stores whatever the UI sends.
- Performance metrics on `/team` (`computePerformanceMetrics`) — depends on completed tasks; could land here but is intentionally deferred to keep scope tight; Phase 5 or later.
- Production deployment — Phase 8.

