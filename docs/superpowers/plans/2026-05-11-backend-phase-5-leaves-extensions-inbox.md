# Backend Phase 5 — Leaves + Extensions + Inbox Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the **leaves**, **deadline-extensions**, and **inbox aggregator** routers on FastAPI (3 routers, ~10 endpoints), then swap the frontend pages that depend on them: `/team/availability` for leaves, the workspace **Extensions** tab, and the **CEO landing page** (`/`) for the inbox. After Phase 5, the CEO's daily workflow runs entirely on FastAPI; only Capture + AI features (Phase 6) still touch Prisma.

**Architecture:**
- **Backend** adds 3 routers — `leaves.py` (CRUD + approval flow), `extensions.py` (CRUD + approval flow), `inbox.py` (aggregator endpoint that joins pending leaves + pending extensions + their requesters). All approval endpoints are **CEO-only**; everyone else can read and create their own.
- **Frontend** migrates 3 surfaces from Prisma to `apiServerFetch` / proxy: `/team/availability` (leave list + new-request form + approve/reject for CEO), the workspace **Extensions tab** (read-only list — currently does its own Prisma read), and the landing page `/` (CEO inbox aggregator).
- **Cleanup** at end of phase deletes the dead Next.js routes (`/api/leave-requests/*`, `/api/deadline-extensions/*`).

**Tech Stack:** Backend FastAPI + psycopg v3 + raw SQL (no new packages). Frontend: no new packages.

**Spec source:** `docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md` — Section 2 (router table for leaves/extensions/inbox), Section 6 Phase 5.

**Branch:** `feature/backend-phase-5-leaves-extensions-inbox` (cut from `master` at the post-Phase-4 merge commit `4743079`)

---

## Decisions locked

| Topic | Decision | Why |
|---|---|---|
| Leave ownership rules | Anyone authenticated can list **their own** leaves (`GET /leaves` returns own for members, all for CEO). Anyone authenticated can `POST` a new leave (their own — `user_id` is set from JWT, not the body). Only **CEO** can `PATCH` to approve/reject. | Standard workflow; matches today's behavior. |
| Extension ownership rules | Same shape as leaves: members see their own (`WHERE requested_by_id = caller`); CEO sees all. CEO-only `PATCH` for approve/reject. | Symmetric. |
| `approved_by_id` on PATCH | Set to `current_user.user_id` automatically — frontend doesn't pass it. | Audit trail; can't be spoofed. |
| Cover person on leave approval | Optional field in the leave row (`cover_person_id`). PATCH body may include `cover_person_id` to assign. | UI supports this; backend just stores it. |
| Inbox endpoint shape | `GET /api/v1/inbox` returns `{pending_leaves: [...], pending_extensions: [...]}` (Phase 6 will add `flagged_captures`). Each item is enriched with the requesting user (id, name, avatar_color) and — for extensions — project + task summaries. | Mirrors today's `lib/queries/inbox.ts` shape so the landing page is a one-line swap. CEO-only. |
| Filters on `/leaves` | Optional `status`, `user_id` query params. CEO can use any combination; members can only filter their own (`user_id` filter is honored but combined with the ownership filter). | Same pattern as `/tasks` and `/submissions`. |
| Filters on `/deadline-extensions` | Optional `status`, `project_id`, `task_id`, `requested_by_id` query params. | Same pattern. |
| Extension state-machine | Backend stores whatever the UI sends. Valid statuses: `pending`, `approved`, `rejected`, `auto_escalated`. | Backend is dumb; UI gates valid transitions. |
| Auto-escalation | Out of scope in v1 — `auto_escalated` is a valid status but nothing on the backend sets it automatically. Could be a future cron job. | YAGNI. |
| Frontend pages migrated | `/team/availability`, `/projects/[id]` workspace Extensions tab, `/` (CEO landing) | Per spec Phase 5. |
| `getExtensionsForProject` (Phase 3 carryover) | Rewrite as `apiServerFetch<HydratedExtension[]>("/api/v1/deadline-extensions?project_id={id}")` | Phase 3 Task 8 deferred this to Phase 5. |
| Test data | Phase 4 seed already covers tasks/submissions. Phase 5 adds one sample leave (pending) and one sample extension (pending) so the inbox isn't empty on first load. | Continuity. |
| Tests | Per-router test file using `client` + `db_clean` fixtures. ~28 new backend tests expected. | Same as Phase 3/4. |
| Deleted Next.js routes (end of phase) | `/api/leave-requests/[id]/route.ts`, `/api/deadline-extensions/[id]/route.ts` | After all callers migrate. |

---

## File structure (after this plan)

```
backend/
├── app/
│   ├── main.py                       # MODIFIED — include 3 new routers
│   ├── schemas/
│   │   ├── leaves.py                 # NEW
│   │   ├── extensions.py             # NEW
│   │   └── inbox.py                  # NEW
│   └── routers/
│       ├── leaves.py                 # NEW — 4 endpoints
│       ├── extensions.py             # NEW — 4 endpoints
│       └── inbox.py                  # NEW — 1 endpoint
└── tests/
    ├── test_routers_leaves.py        # NEW
    ├── test_routers_extensions.py    # NEW
    └── test_routers_inbox.py         # NEW

frontend/
├── src/
│   ├── app/
│   │   ├── page.tsx                                # MODIFIED — landing uses inbox aggregator
│   │   ├── team/availability/page.tsx              # MODIFIED — leaves via FastAPI
│   │   ├── projects/[id]/page.tsx                  # MODIFIED — extensions via FastAPI (replace getExtensionsForProject)
│   │   └── api/
│   │       ├── leave-requests/[id]/route.ts        # DELETED at end of phase
│   │       └── deadline-extensions/[id]/route.ts   # DELETED at end of phase
│   ├── components/                                 # MODIFIED — tab/form components swap fetches to proxy
│   └── lib/
│       └── queries/                                # likely modified — getExtensionsForProject replaced or deleted

docs/
└── migration-mapping.md              # MODIFIED — flip ~9 rows to ✅

backend/
└── scripts/seed.py                   # MODIFIED — adds one pending leave + one pending extension
```

---

## Tasks

### Task 1: Cut branch + sanity check

**Files:** none.

- [ ] **Step 1: Confirm master is at post-Phase-4 merge**

```bash
cd D:/work-space/task/ProjectHub
git checkout master
git pull origin master
git log -1 --oneline
```

Expected: `4743079 Merge pull request #4 from sathizz7/feature/backend-phase-4-tasks-submissions` (or later).

- [ ] **Step 2: Run both suites**

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
```
Expected: **123 tests pass** across 16 files.

```bash
cd ../frontend && npm test 2>&1 | tail -5
```
Expected: **141 tests pass** across 25 files.

- [ ] **Step 3: Cut the branch**

```bash
cd ..
git checkout -b feature/backend-phase-5-leaves-extensions-inbox
```

- [ ] **Step 4: Confirm seed data + Postgres reachable**

```bash
cd backend && source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
import psycopg
from psycopg.rows import dict_row
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        for table in ['users','projects','project_assignees','phases','tasks','submissions','leave_requests','deadline_extensions']:
            cur.execute(f'SELECT count(*) AS c FROM {table}')
            print(f'  {table}: {cur.fetchone()[\"c\"]}')
"
```

Expected: users=5, projects=2, project_assignees=10, phases=10, tasks=7, submissions=2, leave_requests=0, deadline_extensions=0 (the last two get seed data in this phase).

---

### Task 2: Pydantic schemas — leaves, extensions, inbox

**Files:**
- Create: `backend/app/schemas/leaves.py`
- Create: `backend/app/schemas/extensions.py`
- Create: `backend/app/schemas/inbox.py`

### Step 1: Create `backend/app/schemas/leaves.py`

```python
"""Pydantic models for the leaves router."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel


LeaveType = Literal["planned", "sick", "personal", "wfh", "half_day"]
LeaveStatus = Literal["pending", "approved", "rejected"]


class LeaveOut(BaseModel):
    id: str
    user_id: str
    type: LeaveType
    start_date: date
    end_date: date
    days: Decimal
    reason: Optional[str] = None
    status: LeaveStatus
    approved_by_id: Optional[str] = None
    cover_person_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class LeaveCreate(BaseModel):
    type: LeaveType
    start_date: date
    end_date: date
    days: Decimal
    reason: Optional[str] = None
    cover_person_id: Optional[str] = None


class LeaveUpdate(BaseModel):
    """CEO uses this to approve/reject and optionally set cover person."""

    status: Optional[LeaveStatus] = None
    cover_person_id: Optional[str] = None
```

### Step 2: Create `backend/app/schemas/extensions.py`

```python
"""Pydantic models for the deadline-extensions router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


ExtensionStatus = Literal["pending", "approved", "rejected", "auto_escalated"]


class ExtensionOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    requested_by_id: str
    original_deadline: datetime
    requested_deadline: datetime
    reason: Optional[str] = None
    status: ExtensionStatus
    ceo_comment: Optional[str] = None
    approved_by_id: Optional[str] = None
    escalation_level: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class ExtensionCreate(BaseModel):
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    original_deadline: datetime
    requested_deadline: datetime
    reason: Optional[str] = None


class ExtensionUpdate(BaseModel):
    """CEO uses this to approve/reject and optionally leave a comment."""

    status: Optional[ExtensionStatus] = None
    ceo_comment: Optional[str] = None
```

### Step 3: Create `backend/app/schemas/inbox.py`

```python
"""Pydantic models for the inbox aggregator."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class InboxUser(BaseModel):
    id: str
    name: str
    avatar_color: str


class InboxLeave(BaseModel):
    id: str
    user: InboxUser
    type: str
    start_date: str
    end_date: str
    days: float
    reason: Optional[str] = None
    created_at: datetime


class InboxExtension(BaseModel):
    id: str
    requested_by: InboxUser
    project_id: Optional[str] = None
    project_title: Optional[str] = None
    task_id: Optional[str] = None
    task_title: Optional[str] = None
    original_deadline: datetime
    requested_deadline: datetime
    reason: Optional[str] = None
    escalation_level: int
    created_at: datetime


class InboxResponse(BaseModel):
    pending_leaves: List[InboxLeave]
    pending_extensions: List[InboxExtension]
```

### Step 4: Smoke + commit

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
from app.schemas.leaves import LeaveOut, LeaveCreate, LeaveUpdate
from app.schemas.extensions import ExtensionOut, ExtensionCreate, ExtensionUpdate
from app.schemas.inbox import InboxResponse, InboxLeave, InboxExtension
print('schemas OK')
"
pytest 2>&1 | tail -3
```

Expected: `schemas OK` and 123 backend tests pass.

```bash
cd ..
git add backend/app/schemas/leaves.py backend/app/schemas/extensions.py backend/app/schemas/inbox.py
git commit -m "$(cat <<'EOF'
feat(backend): pydantic schemas for leaves, extensions, inbox

- schemas/leaves.py: LeaveOut, LeaveCreate (members can't set user_id;
  derived from JWT), LeaveUpdate (CEO approve/reject + cover person)
- schemas/extensions.py: ExtensionOut, ExtensionCreate (requester
  derived from JWT), ExtensionUpdate (CEO status + ceo_comment)
- schemas/inbox.py: InboxResponse, InboxLeave, InboxExtension —
  shapes for the CEO landing aggregator

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `app/routers/leaves.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/leaves.py`
- Create: `backend/tests/test_routers_leaves.py`
- Modify: `backend/app/main.py`

**Endpoints:**

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/leaves` | any auth; CEO sees all; member sees own. Filters: `status`, `user_id`. |
| GET | `/api/v1/leaves/{id}` | any auth; member's own or CEO. 404 on mismatch. |
| POST | `/api/v1/leaves` | any auth; `user_id` derived from JWT (can't be set in body). |
| PATCH | `/api/v1/leaves/{id}` | **CEO only**. Sets `approved_by_id = caller`. |

### Step 1: Write failing test

```python
"""Integration tests for /api/v1/leaves."""

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
                       ('Mem', 'm@x.com', 'E', 'team_member', '#FFF', %s),
                       ('Other', 'o@x.com', 'X', 'team_member', '#AAA', %s)
                RETURNING id, role_type, email
                """,
                (pw, pw, pw),
            )
            rows = cur.fetchall()
        conn.commit()
    by_email = {r["email"]: str(r["id"]) for r in rows}
    return {
        "ceo_id": by_email["c@x.com"],
        "mem_id": by_email["m@x.com"],
        "other_id": by_email["o@x.com"],
        "ceo_token": issue_access_token(by_email["c@x.com"], "ceo"),
        "mem_token": issue_access_token(by_email["m@x.com"], "team_member"),
        "other_token": issue_access_token(by_email["o@x.com"], "team_member"),
    }


# ----- POST /leaves -----

def test_create_leave_as_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={
            "type": "planned",
            "start_date": "2026-06-01",
            "end_date": "2026-06-03",
            "days": "3.0",
            "reason": "vacation",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["user_id"] == setup["mem_id"]
    assert data["status"] == "pending"
    assert data["type"] == "planned"


def test_create_leave_user_id_not_settable_via_body(setup: dict, client: TestClient) -> None:
    """Even if caller passes user_id, server overrides with caller's id."""
    resp = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={
            "type": "sick",
            "start_date": "2026-06-01",
            "end_date": "2026-06-01",
            "days": "1.0",
            "user_id": setup["other_id"],  # extra field — should be ignored
        },
    )
    # Pydantic doesn't include user_id in LeaveCreate; even if loose-mode is
    # configured to ignore extras, the resulting record must have user_id
    # = caller, never the spoofed value.
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["user_id"] == setup["mem_id"]


def test_create_leave_unauth(client: TestClient, db_clean: None) -> None:
    resp = client.post("/api/v1/leaves", json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"})
    assert resp.status_code == 401


# ----- GET /leaves -----

def test_list_leaves_member_sees_own_only(setup: dict, client: TestClient) -> None:
    # Member creates one
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    # Other member creates one
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["other_token"]),
        json={"type": "sick", "start_date": "2026-06-02", "end_date": "2026-06-02", "days": "1.0"},
    )
    # Member only sees their own
    resp = client.get("/api/v1/leaves", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 200
    rows = resp.json()["data"]
    assert all(r["user_id"] == setup["mem_id"] for r in rows)
    assert len(rows) == 1


def test_list_leaves_ceo_sees_all(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["other_token"]),
        json={"type": "sick", "start_date": "2026-06-02", "end_date": "2026-06-02", "days": "1.0"},
    )
    resp = client.get("/api/v1/leaves", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]) == 2


def test_list_leaves_filter_by_status(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    # CEO approves it
    client.patch(f"/api/v1/leaves/{lid}", headers=_bearer(setup["ceo_token"]), json={"status": "approved"})
    # Filter to pending — should be empty
    resp = client.get("/api/v1/leaves?status=pending", headers=_bearer(setup["ceo_token"]))
    assert resp.json()["data"] == []
    # Filter to approved — should have one
    resp = client.get("/api/v1/leaves?status=approved", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]) == 1


# ----- GET /leaves/{id} -----

def test_get_leave_other_member_returns_404(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.get(f"/api/v1/leaves/{lid}", headers=_bearer(setup["other_token"]))
    assert resp.status_code == 404


def test_get_leave_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/leaves/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404


# ----- PATCH /leaves/{id} -----

def test_patch_leave_as_ceo_approves(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/leaves/{lid}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved", "cover_person_id": setup["other_id"]},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "approved"
    assert data["approved_by_id"] == setup["ceo_id"]
    assert data["cover_person_id"] == setup["other_id"]


def test_patch_leave_as_member_forbidden(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/leaves/{lid}",
        headers=_bearer(setup["mem_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 403


def test_patch_leave_empty_body_returns_400(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/leaves/{lid}",
        headers=_bearer(setup["ceo_token"]),
        json={},
    )
    assert resp.status_code == 400


def test_patch_leave_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        "/api/v1/leaves/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 404
```

12 tests.

### Step 2: Run, verify fail

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_leaves.py -v 2>&1 | tail -10
```

Expected: 404s on every endpoint.

### Step 3: Create `backend/app/routers/leaves.py`

```python
"""Leaves router — list/get/create/approve."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.leaves import LeaveCreate, LeaveUpdate


router = APIRouter(prefix="/api/v1/leaves", tags=["leaves"])


def _shape_leave(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "user_id": str(r["user_id"]),
        "type": r["type"],
        "start_date": r["start_date"].isoformat() if r["start_date"] else None,
        "end_date": r["end_date"].isoformat() if r["end_date"] else None,
        "days": float(r["days"]) if r["days"] is not None else None,
        "reason": r["reason"],
        "status": r["status"],
        "approved_by_id": str(r["approved_by_id"]) if r["approved_by_id"] else None,
        "cover_person_id": str(r["cover_person_id"]) if r["cover_person_id"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


@router.get("")
def list_leaves(
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[UUID] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    where_clauses = []
    params: list = []
    if status_filter is not None:
        where_clauses.append("status = %s")
        params.append(status_filter)
    if user_id is not None:
        where_clauses.append("user_id = %s")
        params.append(str(user_id))
    if user.role_type != "ceo":
        where_clauses.append("user_id = %s")
        params.append(user.user_id)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, user_id, type, start_date, end_date, days, reason, status,
               approved_by_id, cover_person_id, created_at, updated_at
        FROM leave_requests
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
    return ok(data=[_shape_leave(r) for r in rows])


@router.get("/{leave_id}")
def get_leave(leave_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, type, start_date, end_date, days, reason, status,
                       approved_by_id, cover_person_id, created_at, updated_at
                FROM leave_requests WHERE id = %s
                """,
                (str(leave_id),),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Leave not found")
    if user.role_type != "ceo" and str(row["user_id"]) != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Leave not found")
    return ok(data=_shape_leave(row))


@router.post("")
def create_leave(payload: LeaveCreate, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO leave_requests (user_id, type, start_date, end_date, days,
                                            reason, status, cover_person_id)
                VALUES (%(user_id)s, %(type)s, %(start_date)s, %(end_date)s, %(days)s,
                        %(reason)s, 'pending', %(cover_person_id)s)
                RETURNING id, user_id, type, start_date, end_date, days, reason, status,
                          approved_by_id, cover_person_id, created_at, updated_at
                """,
                {
                    "user_id": user.user_id,
                    "type": payload.type,
                    "start_date": payload.start_date,
                    "end_date": payload.end_date,
                    "days": payload.days,
                    "reason": payload.reason,
                    "cover_person_id": payload.cover_person_id,
                },
            )
            row = cur.fetchone()
            assert row is not None
        conn.commit()
    return ok(data=_shape_leave(row), message="Created")


@router.patch("/{leave_id}", dependencies=[Depends(require_roles("ceo"))])
def update_leave(
    leave_id: UUID,
    payload: LeaveUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    set_pairs = [f"{k} = %({k})s" for k in fields]
    params: dict = {**fields, "__id": str(leave_id), "__approver": user.user_id}
    # Auto-stamp approved_by_id whenever status is being changed
    if "status" in fields:
        set_pairs.append("approved_by_id = %(__approver)s")

    sql = (
        f"UPDATE leave_requests SET {', '.join(set_pairs)}, updated_at = now() "
        f"WHERE id = %(__id)s "
        f"RETURNING id, user_id, type, start_date, end_date, days, reason, status, "
        f"          approved_by_id, cover_person_id, created_at, updated_at"
    )
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Leave not found")
    return ok(data=_shape_leave(row))
```

### Step 4: Wire into main.py

Update import:
```python
from app.routers import auth, checkpoints, feedback, health, leaves, phases, projects, submissions, tasks, users
```

After `app.include_router(checkpoints.router)`, add:
```python
app.include_router(leaves.router)
```

### Step 5: Run tests

```bash
pytest tests/test_routers_leaves.py -v 2>&1 | tail -20
pytest -v 2>&1 | tail -5
```

Expected: 12 leaves tests pass; full suite 135 (123 + 12).

### Step 6: Commit

```bash
cd ..
git add backend/app/routers/leaves.py backend/app/main.py backend/tests/test_routers_leaves.py
git commit -m "$(cat <<'EOF'
feat(backend): leaves router — list/get/create/approve

- GET /api/v1/leaves — list. CEO sees all; member sees own.
  Filters: status, user_id.
- GET /api/v1/leaves/{id} — 404 on unknown OR member's-not-own.
- POST /api/v1/leaves — authenticated; user_id derived from JWT
  (can't be set in body). Status defaults to 'pending'.
- PATCH /api/v1/leaves/{id} — CEO only. Auto-stamps
  approved_by_id when status changes. 400 on empty body.

12 integration tests cover scoping, ownership 404, role guard,
and the auto-stamped approver.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `app/routers/extensions.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/extensions.py`
- Create: `backend/tests/test_routers_extensions.py`
- Modify: `backend/app/main.py`

**Endpoints:**

| Method | Path | Auth |
|---|---|---|
| GET | `/api/v1/deadline-extensions` | any auth; CEO sees all; member sees own (filter on `requested_by_id`). Filters: `status`, `project_id`, `task_id`. |
| GET | `/api/v1/deadline-extensions/{id}` | any auth; member's own or CEO. 404 on mismatch. |
| POST | `/api/v1/deadline-extensions` | any auth; `requested_by_id` derived from JWT. If `project_id` set, caller must have project access. |
| PATCH | `/api/v1/deadline-extensions/{id}` | **CEO only**. Sets `approved_by_id = caller`. |

### Step 1: Failing test

```python
"""Integration tests for /api/v1/deadline-extensions."""

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
        "mem_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "mem_token": issue_access_token(by_role["team_member"], "team_member"),
    }
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(ctx["ceo_token"]),
        json={
            "title": "P", "type": "engineering", "priority": "low",
            "assignee_ids": [ctx["mem_id"]],
        },
    )
    ctx["project_id"] = resp.json()["data"]["id"]
    return ctx


# ----- POST -----

def test_create_extension_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
            "reason": "Need more time for testing",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["requested_by_id"] == setup["mem_id"]
    assert data["status"] == "pending"
    assert data["escalation_level"] == 0


def test_create_extension_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
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
        "/api/v1/deadline-extensions",
        headers=_bearer(other_token),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    assert resp.status_code == 404


# ----- GET list -----

def test_list_extensions_member_sees_own(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get("/api/v1/deadline-extensions", headers=_bearer(setup["mem_token"]))
    rows = resp.json()["data"]
    assert all(r["requested_by_id"] == setup["mem_id"] for r in rows)
    assert len(rows) == 1


def test_list_extensions_ceo_sees_all(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get("/api/v1/deadline-extensions", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]) == 1


def test_list_extensions_filter_by_project(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get(
        f"/api/v1/deadline-extensions?project_id={setup['project_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert all(r["project_id"] == setup["project_id"] for r in resp.json()["data"])


def test_list_extensions_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/deadline-extensions").status_code == 401


# ----- PATCH -----

def test_patch_extension_as_ceo_approves(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    eid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/deadline-extensions/{eid}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved", "ceo_comment": "Sure, take the extra time"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "approved"
    assert data["approved_by_id"] == setup["ceo_id"]
    assert data["ceo_comment"] == "Sure, take the extra time"


def test_patch_extension_as_member_forbidden(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    eid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/deadline-extensions/{eid}",
        headers=_bearer(setup["mem_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 403


def test_patch_extension_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        "/api/v1/deadline-extensions/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 404
```

9 tests.

### Step 2: Run, verify fail

```bash
pytest tests/test_routers_extensions.py -v 2>&1 | tail -10
```

### Step 3: Create `backend/app/routers/extensions.py`

```python
"""Deadline-extensions router — list/get/create/approve."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.extensions import ExtensionCreate, ExtensionUpdate


router = APIRouter(prefix="/api/v1/deadline-extensions", tags=["deadline-extensions"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _shape_extension(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "task_id": str(r["task_id"]) if r["task_id"] else None,
        "requested_by_id": str(r["requested_by_id"]),
        "original_deadline": r["original_deadline"].isoformat() if r["original_deadline"] else None,
        "requested_deadline": r["requested_deadline"].isoformat() if r["requested_deadline"] else None,
        "reason": r["reason"],
        "status": r["status"],
        "ceo_comment": r["ceo_comment"],
        "approved_by_id": str(r["approved_by_id"]) if r["approved_by_id"] else None,
        "escalation_level": r["escalation_level"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


@router.get("")
def list_extensions(
    status_filter: Optional[str] = Query(None, alias="status"),
    project_id: Optional[UUID] = Query(None),
    task_id: Optional[UUID] = Query(None),
    requested_by_id: Optional[UUID] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    where_clauses = []
    params: list = []
    if status_filter is not None:
        where_clauses.append("status = %s")
        params.append(status_filter)
    if project_id is not None:
        where_clauses.append("project_id = %s")
        params.append(str(project_id))
    if task_id is not None:
        where_clauses.append("task_id = %s")
        params.append(str(task_id))
    if requested_by_id is not None:
        where_clauses.append("requested_by_id = %s")
        params.append(str(requested_by_id))
    if user.role_type != "ceo":
        where_clauses.append("requested_by_id = %s")
        params.append(user.user_id)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, project_id, task_id, requested_by_id, original_deadline,
               requested_deadline, reason, status, ceo_comment, approved_by_id,
               escalation_level, created_at, updated_at
        FROM deadline_extensions
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
    return ok(data=[_shape_extension(r) for r in rows])


@router.get("/{ext_id}")
def get_extension(ext_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, task_id, requested_by_id, original_deadline,
                       requested_deadline, reason, status, ceo_comment, approved_by_id,
                       escalation_level, created_at, updated_at
                FROM deadline_extensions WHERE id = %s
                """,
                (str(ext_id),),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Extension not found")
    if user.role_type != "ceo" and str(row["requested_by_id"]) != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Extension not found")
    return ok(data=_shape_extension(row))


@router.post("")
def create_extension(
    payload: ExtensionCreate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if payload.project_id is not None:
                if not _user_can_see_project(cur, payload.project_id, user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO deadline_extensions
                  (project_id, task_id, requested_by_id, original_deadline,
                   requested_deadline, reason, status, escalation_level)
                VALUES (%(project_id)s, %(task_id)s, %(requested_by_id)s,
                        %(original_deadline)s, %(requested_deadline)s, %(reason)s,
                        'pending', 0)
                RETURNING id, project_id, task_id, requested_by_id, original_deadline,
                          requested_deadline, reason, status, ceo_comment, approved_by_id,
                          escalation_level, created_at, updated_at
                """,
                {
                    "project_id": payload.project_id,
                    "task_id": payload.task_id,
                    "requested_by_id": user.user_id,
                    "original_deadline": payload.original_deadline,
                    "requested_deadline": payload.requested_deadline,
                    "reason": payload.reason,
                },
            )
            row = cur.fetchone()
            assert row is not None
        conn.commit()
    return ok(data=_shape_extension(row), message="Created")


@router.patch("/{ext_id}", dependencies=[Depends(require_roles("ceo"))])
def update_extension(
    ext_id: UUID,
    payload: ExtensionUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    set_pairs = [f"{k} = %({k})s" for k in fields]
    params: dict = {**fields, "__id": str(ext_id), "__approver": user.user_id}
    if "status" in fields:
        set_pairs.append("approved_by_id = %(__approver)s")

    sql = (
        f"UPDATE deadline_extensions SET {', '.join(set_pairs)}, updated_at = now() "
        f"WHERE id = %(__id)s "
        f"RETURNING id, project_id, task_id, requested_by_id, original_deadline, "
        f"          requested_deadline, reason, status, ceo_comment, approved_by_id, "
        f"          escalation_level, created_at, updated_at"
    )
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Extension not found")
    return ok(data=_shape_extension(row))
```

### Step 4: Wire into main.py

Update import to add `extensions`:
```python
from app.routers import (
    auth, checkpoints, extensions, feedback, health, leaves, phases,
    projects, submissions, tasks, users,
)
```

After `app.include_router(leaves.router)`, add:
```python
app.include_router(extensions.router)
```

### Step 5: Run tests + commit

```bash
pytest tests/test_routers_extensions.py -v 2>&1 | tail -15
pytest -v 2>&1 | tail -5
```

Expected: 9 extensions tests pass; full suite 144 (135 + 9).

```bash
cd ..
git add backend/app/routers/extensions.py backend/app/main.py backend/tests/test_routers_extensions.py
git commit -m "$(cat <<'EOF'
feat(backend): extensions router — list/get/create/approve

- GET /api/v1/deadline-extensions — CEO sees all; member sees own
  (requested_by_id filter). Optional filters: status, project_id,
  task_id, requested_by_id.
- GET /api/v1/deadline-extensions/{id} — 404 on unknown or
  member's-not-own.
- POST /api/v1/deadline-extensions — authenticated;
  requested_by_id from JWT. If project_id set, caller must have
  access. escalation_level defaults to 0.
- PATCH /api/v1/deadline-extensions/{id} — CEO only. Auto-stamps
  approved_by_id when status changes. 400 on empty body.

9 integration tests cover all paths including the ownership 404
on member-not-on-project create attempts.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `app/routers/inbox.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/inbox.py`
- Create: `backend/tests/test_routers_inbox.py`
- Modify: `backend/app/main.py`

**Endpoint:** `GET /api/v1/inbox` — **CEO only**. Returns `{pending_leaves: [...], pending_extensions: [...]}` enriched with user/project/task info.

### Step 1: Failing test

```python
"""Integration tests for /api/v1/inbox."""

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
        "mem_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "mem_token": issue_access_token(by_role["team_member"], "team_member"),
    }
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(ctx["ceo_token"]),
        json={
            "title": "P", "type": "engineering", "priority": "low",
            "assignee_ids": [ctx["mem_id"]],
        },
    )
    ctx["project_id"] = resp.json()["data"]["id"]
    return ctx


def test_inbox_includes_pending_leaves(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-03", "days": "3.0"},
    )
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["pending_leaves"]) == 1
    leave = data["pending_leaves"][0]
    assert leave["user"]["id"] == setup["mem_id"]
    assert leave["type"] == "planned"


def test_inbox_includes_pending_extensions(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    data = resp.json()["data"]
    assert len(data["pending_extensions"]) == 1
    ext = data["pending_extensions"][0]
    assert ext["requested_by"]["id"] == setup["mem_id"]
    assert ext["project_id"] == setup["project_id"]


def test_inbox_excludes_approved_items(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    client.patch(f"/api/v1/leaves/{lid}", headers=_bearer(setup["ceo_token"]), json={"status": "approved"})
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]["pending_leaves"]) == 0


def test_inbox_empty_when_nothing_pending(setup: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    data = resp.json()["data"]
    assert data["pending_leaves"] == []
    assert data["pending_extensions"] == []


def test_inbox_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 403
```

5 tests.

### Step 2: Run, verify fail

```bash
pytest tests/test_routers_inbox.py -v 2>&1 | tail -10
```

### Step 3: Create `backend/app/routers/inbox.py`

```python
"""Inbox aggregator — CEO landing page data."""

from fastapi import APIRouter, Depends

from app.auth import require_roles
from app.db import get_conn
from app.responses import ok


router = APIRouter(prefix="/api/v1/inbox", tags=["inbox"])


def _user_summary(row: dict, prefix: str = "u_") -> dict:
    return {
        "id": str(row[f"{prefix}id"]),
        "name": row[f"{prefix}name"],
        "avatar_color": row[f"{prefix}avatar_color"],
    }


@router.get("", dependencies=[Depends(require_roles("ceo"))])
def get_inbox() -> dict:
    """Return all pending leaves + pending extensions for the CEO."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Pending leaves with requester
            cur.execute(
                """
                SELECT l.id, l.type, l.start_date, l.end_date, l.days, l.reason,
                       l.created_at,
                       u.id AS u_id, u.name AS u_name, u.avatar_color AS u_avatar_color
                FROM leave_requests l JOIN users u ON l.user_id = u.id
                WHERE l.status = 'pending'
                ORDER BY l.created_at DESC
                """
            )
            pending_leaves = []
            for r in cur.fetchall():
                pending_leaves.append({
                    "id": str(r["id"]),
                    "user": _user_summary(r),
                    "type": r["type"],
                    "start_date": r["start_date"].isoformat() if r["start_date"] else None,
                    "end_date": r["end_date"].isoformat() if r["end_date"] else None,
                    "days": float(r["days"]) if r["days"] is not None else None,
                    "reason": r["reason"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                })

            # Pending extensions with requester + project + task
            cur.execute(
                """
                SELECT e.id, e.project_id, e.task_id, e.original_deadline,
                       e.requested_deadline, e.reason, e.escalation_level, e.created_at,
                       u.id AS u_id, u.name AS u_name, u.avatar_color AS u_avatar_color,
                       p.title AS project_title,
                       t.title AS task_title
                FROM deadline_extensions e
                JOIN users u ON e.requested_by_id = u.id
                LEFT JOIN projects p ON e.project_id = p.id
                LEFT JOIN tasks t ON e.task_id = t.id
                WHERE e.status = 'pending'
                ORDER BY e.created_at DESC
                """
            )
            pending_extensions = []
            for r in cur.fetchall():
                pending_extensions.append({
                    "id": str(r["id"]),
                    "requested_by": _user_summary(r),
                    "project_id": str(r["project_id"]) if r["project_id"] else None,
                    "project_title": r["project_title"],
                    "task_id": str(r["task_id"]) if r["task_id"] else None,
                    "task_title": r["task_title"],
                    "original_deadline": r["original_deadline"].isoformat() if r["original_deadline"] else None,
                    "requested_deadline": r["requested_deadline"].isoformat() if r["requested_deadline"] else None,
                    "reason": r["reason"],
                    "escalation_level": r["escalation_level"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                })

    return ok(data={
        "pending_leaves": pending_leaves,
        "pending_extensions": pending_extensions,
    })
```

### Step 4: Wire into main.py

```python
from app.routers import (
    auth, checkpoints, extensions, feedback, health, inbox, leaves, phases,
    projects, submissions, tasks, users,
)
```

After `app.include_router(extensions.router)`:
```python
app.include_router(inbox.router)
```

### Step 5: Run tests + commit

```bash
pytest tests/test_routers_inbox.py -v 2>&1 | tail -10
pytest -v 2>&1 | tail -5
```

Expected: 5 inbox tests pass; full suite 149 (144 + 5).

```bash
cd ..
git add backend/app/routers/inbox.py backend/app/main.py backend/tests/test_routers_inbox.py
git commit -m "$(cat <<'EOF'
feat(backend): inbox aggregator — CEO landing data

- GET /api/v1/inbox — CEO-only. Returns:
  {pending_leaves: [{user, type, start_date, end_date, days, ...}, ...],
   pending_extensions: [{requested_by, project_title, task_title,
                         original_deadline, requested_deadline, ...}, ...]}
- Joins leave_requests + users; deadline_extensions + users + projects + tasks
  in two parallel queries within one DB connection
- 403 for team members; 200 with empty arrays when nothing pending

5 integration tests cover happy paths, the approved-item exclusion,
empty inbox, and role guard.

Phase 6 will extend this with flagged_captures from the capture
domain.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Seed sample leave + extension

**Files:**
- Modify: `backend/scripts/seed.py`

Add one pending leave (from Arjun) and one pending extension (from Vikram on the API Gateway project's first task) so the inbox isn't empty after seeding.

### Step 1: Update seed function

Add this block to `seed()` after the submissions block, before `conn.commit()`:

```python
            # 8. Sample pending leave (idempotent — check by user_id + start_date)
            arjun_id = users_by_email.get("arjun@projecthub.dev")
            if arjun_id:
                cur.execute(
                    """
                    SELECT 1 FROM leave_requests
                    WHERE user_id = %s AND start_date = %s
                    """,
                    (arjun_id, "2026-06-15"),
                )
                if cur.fetchone() is None:
                    cur.execute(
                        """
                        INSERT INTO leave_requests
                          (user_id, type, start_date, end_date, days, reason, status)
                        VALUES (%s, 'planned', '2026-06-15', '2026-06-19', 5.0,
                                'Family vacation', 'pending')
                        """,
                        (arjun_id,),
                    )

            # 9. Sample pending deadline extension (idempotent — check by requester + project)
            vikram_id = users_by_email.get("vikram@projecthub.dev")
            gateway_pid = project_ids.get("API Gateway Modernization")
            if vikram_id and gateway_pid:
                cur.execute(
                    """
                    SELECT 1 FROM deadline_extensions
                    WHERE requested_by_id = %s AND project_id = %s
                    """,
                    (vikram_id, gateway_pid),
                )
                if cur.fetchone() is None:
                    cur.execute(
                        """
                        INSERT INTO deadline_extensions
                          (project_id, requested_by_id, original_deadline,
                           requested_deadline, reason, status, escalation_level)
                        VALUES (%s, %s, '2026-07-01T00:00:00Z',
                                '2026-07-15T00:00:00Z',
                                'Need more time for stakeholder review',
                                'pending', 0)
                        """,
                        (gateway_pid, vikram_id),
                    )
```

### Step 2: Re-seed + verify

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute('TRUNCATE users RESTART IDENTITY CASCADE')
print('truncated')
"
python -m scripts.seed

PYTHONIOENCODING=utf-8 python -c "
import psycopg
from psycopg.rows import dict_row
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', row_factory=dict_row) as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT count(*) AS c FROM leave_requests WHERE status = %s', ('pending',))
        print('pending leaves:', cur.fetchone()['c'])
        cur.execute('SELECT count(*) AS c FROM deadline_extensions WHERE status = %s', ('pending',))
        print('pending extensions:', cur.fetchone()['c'])
"
```

Expected: `pending leaves: 1`, `pending extensions: 1`.

### Step 3: Run seed tests + commit

```bash
pytest tests/test_seed.py -v 2>&1 | tail -10
```

Expected: 4 tests still pass.

```bash
cd ..
git add backend/scripts/seed.py
git commit -m "$(cat <<'EOF'
feat(backend): seed one pending leave + one pending extension

Without these, the inbox is empty on first login and there's
nothing to demo on the CEO landing page. Both are idempotent.

- Pending leave: Arjun's family vacation 2026-06-15 → 2026-06-19
- Pending extension: Vikram on "API Gateway Modernization" project,
  asking for 2 more weeks

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Backend smoke test

Exercise all three routers via curl from a 3rd terminal while uvicorn is up.

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --port 8000 &
UVICORN_PID=$!
sleep 4

# CEO login
LOGIN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ceo@projecthub.dev","password":"projecthub-dev"}')
ACCESS=$(echo "$LOGIN" | python -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

echo "=== Inbox ==="
curl -s http://localhost:8000/api/v1/inbox -H "Authorization: Bearer $ACCESS" | python -m json.tool | head -30

echo "=== Leaves ==="
curl -s http://localhost:8000/api/v1/leaves -H "Authorization: Bearer $ACCESS" | python -m json.tool | head -20

echo "=== Extensions ==="
curl -s http://localhost:8000/api/v1/deadline-extensions -H "Authorization: Bearer $ACCESS" | python -m json.tool | head -20

kill $UVICORN_PID 2>/dev/null
wait 2>/dev/null
cd ..
```

Expected: inbox shows 1 pending leave + 1 pending extension. Each list endpoint returns the same data filtered.

This is a verification-only task — no commit.

---

### Task 8: Frontend — `/team/availability` page migrates leaves to FastAPI

**Files:** modify `frontend/src/app/team/availability/page.tsx` and any client components it uses for the leave-request form/approve flow.

### Step 1: Inventory existing leave fetches

```bash
cd frontend
grep -rn "leave-request\|leave_request\|api/leave" src/ 2>&1 | grep -v "__tests__" | head -20
cat src/app/team/availability/page.tsx 2>&1 | head -40
```

### Step 2: Rewrite

The page is likely a Server Component that calls Prisma directly (or via a helper). Swap to:

```typescript
const leaves = await apiServerFetch<LeaveOut[]>("/api/v1/leaves");
```

For the create-leave form (client component): change the fetch from `/api/leave-requests` to `/api/proxy/v1/leaves` with snake_case body `{type, start_date, end_date, days, reason?, cover_person_id?}`. Response envelope unwrap + `router.refresh()`.

For approve/reject (CEO action): `PATCH /api/proxy/v1/leaves/{id}` with `{status, cover_person_id?}` body.

### Step 3: Type-check + tests + commit

```bash
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: 141 tests still pass.

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
refactor(frontend): /team/availability reads/writes leaves via FastAPI

- Page Server Component: apiServerFetch<LeaveOut[]>("/api/v1/leaves")
  replaces Prisma helper
- Create leave form (client): POST /api/proxy/v1/leaves with
  snake_case body (start_date, end_date, days, reason,
  cover_person_id)
- Approve/reject (CEO): PATCH /api/proxy/v1/leaves/{id} with
  {status, cover_person_id?}
- Response envelope unwrapped; router.refresh() on success

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Frontend — workspace Extensions tab + create-extension flow

**Files:** modify the workspace page (`frontend/src/app/projects/[id]/page.tsx`) to fetch extensions from FastAPI, and the extensions tab + create-extension form to use the proxy.

### Step 1: Replace `getExtensionsForProject` with `apiServerFetch`

In `frontend/src/app/projects/[id]/page.tsx`, find the `getExtensionsForProject(id)` call and replace with:

```typescript
type HydratedExtension = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  requested_by_id: string;
  original_deadline: string;
  requested_deadline: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "auto_escalated";
  ceo_comment: string | null;
  approved_by_id: string | null;
  escalation_level: number;
  created_at: string;
  updated_at: string | null;
};

const extensionsRaw = await apiServerFetch<HydratedExtension[]>(
  `/api/v1/deadline-extensions?project_id=${id}`
);
```

You'll also need to look up the requester for each extension (name + avatar). The cheapest path: also fetch `/api/v1/users` once and build a Map<id, user>. Or call `apiServerFetch<UserList>("/api/v1/users")` in parallel.

Then the `serializedExtensions` mapping changes from `getExtensionsForProject(...)` shape (`requestedBy` object included) to the new flat shape — enrich with user info from the lookup Map.

### Step 2: Update mutation calls in workspace components

Find any `fetch("/api/deadline-extensions/...")` in the extensions tab or any create-extension form → swap to `/api/proxy/v1/deadline-extensions/...`. Body keys become snake_case: `original_deadline`, `requested_deadline`, `project_id`, `task_id`.

### Step 3: Drop the `getExtensionsForProject` import (and possibly delete the helper)

```bash
grep -rn "getExtensionsForProject" frontend/src/ 2>&1
```

If nothing else uses it, delete the helper from `frontend/src/lib/queries/`. If something else uses it, leave it alone and just remove the workspace-page import.

### Step 4: tsc + tests + commit

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: 141 tests still pass.

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
refactor(frontend): workspace extensions tab reads/writes via FastAPI

- Workspace page: getExtensionsForProject (Prisma) →
  apiServerFetch<HydratedExtension[]>(/api/v1/deadline-extensions
  ?project_id=…) + a parallel /users fetch for requester enrichment
- Extensions tab mutations: /api/deadline-extensions/* →
  /api/proxy/v1/deadline-extensions/* with snake_case bodies
- Response envelope unwrapped; router.refresh() on success

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Frontend — CEO landing page (`/`) uses inbox aggregator

**Files:** modify `frontend/src/app/page.tsx` (CEO Command Center).

### Step 1: Read current page

```bash
cat frontend/src/app/page.tsx
```

Note any Prisma calls and helper imports (likely from `frontend/src/lib/queries/inbox.ts`).

### Step 2: Swap to apiServerFetch

```typescript
type InboxUser = { id: string; name: string; avatar_color: string };

type InboxLeave = {
  id: string;
  user: InboxUser;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  created_at: string;
};

type InboxExtension = {
  id: string;
  requested_by: InboxUser;
  project_id: string | null;
  project_title: string | null;
  task_id: string | null;
  task_title: string | null;
  original_deadline: string;
  requested_deadline: string;
  reason: string | null;
  escalation_level: number;
  created_at: string;
};

type InboxResponse = {
  pending_leaves: InboxLeave[];
  pending_extensions: InboxExtension[];
};

// Inside the page component
const inbox = await apiServerFetch<InboxResponse>("/api/v1/inbox");
```

For team-member view of `/`, you'll need a separate code path — they shouldn't call `/api/v1/inbox` (which 403s). Read `user.roleType` and branch: CEO → inbox; team-member → some lighter view (their own pending leaves + extensions via `/leaves` and `/deadline-extensions`).

### Step 3: Update component fields (snake_case)

The old Prisma shape used camelCase (`startDate`, `originalDeadline`, `avatarColor`). The new shape uses snake_case at the leaves. Walk the JSX and update field references.

### Step 4: tsc + tests + commit

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
refactor(frontend): CEO landing page uses /api/v1/inbox aggregator

- CEO branch: apiServerFetch<InboxResponse>("/api/v1/inbox") —
  one round-trip for pending_leaves + pending_extensions, each
  enriched with user / project / task info server-side
- Team-member branch: fetches own pending leaves + own pending
  extensions via /leaves and /deadline-extensions filtered by
  status=pending
- Field name updates (snake_case) at the leaves

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Delete dead Next.js routes

**Files (delete, if they exist):**
- `frontend/src/app/api/leave-requests/[id]/route.ts`
- `frontend/src/app/api/leave-requests/route.ts` (if exists)
- `frontend/src/app/api/deadline-extensions/[id]/route.ts`
- `frontend/src/app/api/deadline-extensions/route.ts` (if exists)

### Step 1: Verify no remaining references

```bash
cd frontend
grep -rn '"/api/leave-requests\|"/api/deadline-extensions' src/ 2>&1 | head -20
```

Expected: empty (or only inside test mocks).

### Step 2: Delete

```bash
git rm "src/app/api/leave-requests/[id]/route.ts" 2>&1 || echo "(already gone)"
git rm src/app/api/leave-requests/route.ts 2>&1 || echo "(already gone)"
git rm "src/app/api/deadline-extensions/[id]/route.ts" 2>&1 || echo "(already gone)"
git rm src/app/api/deadline-extensions/route.ts 2>&1 || echo "(already gone)"
```

### Step 3: Verify + commit

```bash
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
```

Expected: 141 tests pass.

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
chore(frontend): delete dead Prisma-backed API routes

Removed (where present):
- /api/leave-requests, /api/leave-requests/[id]
- /api/deadline-extensions, /api/deadline-extensions/[id]

All replaced by FastAPI via /api/proxy/[...path]. Phase 5 tasks
8-10 rewired the callers.

Remaining /api routes after Phase 5:
- auth/login, auth/logout, auth/refresh (Phase 2)
- proxy/[...path] (Phase 2)
- ai/, capture/ (Phase 6 work)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: E2E smoke + migration-mapping + push

### Step 1: Run both suites

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
cd ../frontend && npm test 2>&1 | tail -5
```

Expected: backend 149, frontend 141.

### Step 2: End-to-end manual smoke

Backend + frontend running. In browser:

1. Log in as CEO → landing page (`/`) shows the seeded pending leave (Arjun's vacation) and pending extension (Vikram's deadline ask).
2. Approve the leave → it disappears from the inbox.
3. Visit `/team/availability` → see all leaves; create a new test leave; approve it.
4. Visit `/projects/<id>` → Extensions tab shows Vikram's pending extension (or empty if you already approved it).
5. As team member (incognito): visit `/team/availability` → see only own leaves; create a new one. Visit landing `/` → see own pending items (no inbox aggregator since it's CEO-only).

### Step 3: Update `docs/migration-mapping.md`

Flip these rows from ⏳ to ✅:
- `PATCH /api/leave-requests/[id]` → `PATCH /api/v1/leaves/{id}` (✅; Phase 5)
- `GET /api/v1/leaves`, `POST /api/v1/leaves`, `GET /api/v1/leaves/{id}` (new routes; Phase 5)
- `PATCH /api/deadline-extensions/[id]` → `PATCH /api/v1/deadline-extensions/{id}` (✅; Phase 5)
- `GET /api/v1/deadline-extensions`, `POST /api/v1/deadline-extensions`, `GET /api/v1/deadline-extensions/{id}` (new; Phase 5)
- `GET /api/v1/inbox` (new; Phase 5)

### Step 4: Commit + push

```bash
cd ..
git add docs/migration-mapping.md
git commit -m "$(cat <<'EOF'
docs(migration): mark Phase 5 routes as done

Leaves, deadline-extensions, and inbox aggregator all live and
consumed by the frontend. CEO landing page now hits /api/v1/inbox
for one-round-trip aggregation; team-member landing branches to
filtered /leaves + /deadline-extensions calls.

End-of-Phase-5 state:
- Backend: 149 tests across 19 files (+26 from Phase 5)
- Frontend: 141 tests across 25 files
- Migrated mutation paths: leaves (POST/PATCH), extensions
  (POST/PATCH)
- Deleted Next.js routes: /api/leave-requests/*, 
  /api/deadline-extensions/*

Capture + AI is the only domain still on Prisma — Phase 6.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git push -u origin feature/backend-phase-5-leaves-extensions-inbox
```

---

## Acceptance criteria

When all tasks are complete:

1. Branch `feature/backend-phase-5-leaves-extensions-inbox` exists with ~10-12 commits, pushed to origin.
2. `cd backend && pytest -v` → **~149 tests pass** (was 123; +12 leaves, +9 extensions, +5 inbox = +26).
3. `cd frontend && npm test` → 141 tests pass.
4. `cd backend && uvicorn app.main:app --port 8000` boots; OpenAPI shows the 10 new endpoints alongside existing.
5. **Manual flow works**:
   - CEO landing `/` shows pending leaves + extensions; can approve/reject.
   - `/team/availability` shows leaves; create + approve work end-to-end.
   - Workspace Extensions tab shows extensions; create + approve work.
6. `frontend/src/app/api/` contains: `auth/`, `proxy/`, `ai/`, `capture/` — the two Phase 5 directories are gone.
7. `docs/migration-mapping.md` has ~9 newly-✅ rows.
8. CEO sees all; team members are scoped to their own; CEO-only writes are enforced (403 on leaves/extensions PATCH and on `/inbox`).

## Out of scope (deferred)

- Capture + AI — Phase 6.
- Removing Prisma + dev.db + remaining `/api/*` — Phase 7.
- Production deployment — Phase 8.
- `/me` (My Profile) page — small follow-up.
- Auto-escalation logic for extensions (the `auto_escalated` status exists but nothing sets it) — future cron job.
- Calendar view of leaves — out of scope; future feature.
