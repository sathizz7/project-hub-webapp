# Backend Phase 6 — Capture + AI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stand up the **AI capture** and **AI helpers** domain on FastAPI. Adds two routers (`capture.py` for sessions + items, `ai.py` for generate-plan / review / suggest-stack), wires up **LiteLLM with Gemini 2.5 Flash** (primary) + **Gemini 2.5 Flash-Lite** (fallback) for LLM calls, and migrates the `/capture` page + `/projects/new` AI plan generation + reviews-tab AI feedback to the new endpoints. After Phase 6, **every domain runs on FastAPI** — Phase 7 deletes Prisma and `dev.db` entirely.

**Architecture:**
- **Backend** adds two routers — `capture.py` (sessions list/get, items patch, `POST /capture/process` that runs the LLM parse and writes session + items in one transaction), `ai.py` (3 stateless LLM endpoints). New file `app/ai.py` is a thin wrapper around `litellm.completion(...)` with `fallbacks=[...]` and a 60s timeout. Prompts live in `app/prompts/*.py` as Python modules exporting `SYSTEM_PROMPT` constants.
- **Frontend** swaps the `/capture` page from its Prisma data fetch to `apiServerFetch` + proxy calls. The `/projects/new` wizard's AI plan generation step swaps from `/api/ai/generate-plan` to `/api/proxy/v1/ai/generate-plan`. The reviews-tab AI feedback button swaps from `/api/ai/review` to the proxy.
- **Cleanup** at end of phase deletes the remaining Prisma-backed Next.js API routes (`/api/capture/process`, `/api/ai/generate-plan`, `/api/ai/review`, `/api/ai/suggest-stack`).

**Tech Stack:** Backend FastAPI + psycopg + **LiteLLM** (`litellm>=1.50,<2`). Frontend: no new packages.

**Spec source:** `docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md` — Section 5 (AI integration), Section 6 Phase 6.

**Branch:** `feature/backend-phase-6-capture-ai` (cut from `master` at the post-Phase-5 merge commit `b75598b`)

---

## Decisions locked

| Topic | Decision | Why |
|---|---|---|
| LLM library | **`litellm`** (1.50+) | unified API across providers; built-in fallback support; provider swap is one-line. |
| Primary model | `gemini/gemini-2.5-flash` | per spec Section 5; user chose Gemini. |
| Fallback model | `gemini/gemini-2.5-flash-lite` | LiteLLM `fallbacks=[...]` auto-failover on rate limit / 5xx. |
| API key | `GEMINI_API_KEY` env var | LiteLLM picks it up automatically for `gemini/` provider. Optional in dev (already in `.env.example`); required for actual AI calls — if missing, endpoints return 503. |
| Timeouts | 60s on `litellm.completion(..., timeout=60)` | matches spec; avoids 10-min hangs. |
| Streaming | **Synchronous only in v1** | spec Section 5; frontend keeps existing spinner UX. |
| Prompt caching | **None in v1** | low volume; no measurable benefit. |
| JSON parsing | `parse_json_response(text, fallback)` helper strips markdown fences (` ```json `) before `json.loads`; returns fallback on error | Gemini occasionally wraps JSON in fences. |
| Capture session write | `POST /capture/process` is **atomic**: LLM call → INSERT capture_sessions → INSERT capture_items in one transaction. If LLM fails or returns empty array, the session is still created with empty items so the user can retry. | Matches spec Section 5 error-handling notes. |
| Capture ownership | Capture sessions belong to the creating user. Users can only see/edit their own sessions and items. CEO has no special access (capture is personal). | Capture is a private notepad. |
| AI endpoints scope | All AI endpoints are **CEO-only** (`POST /ai/generate-plan`, `POST /ai/review`, `POST /ai/suggest-stack`) | per spec Section 2 table. |
| `POST /ai/review` storage | The endpoint **just calls the LLM and returns text**. It does NOT auto-save feedback. The caller decides whether to persist via `POST /submissions/{id}/feedback` with `is_ai=True` (Phase 4 endpoint). | Separation of concerns; caller may want to edit AI output before saving. |
| Tests | Unit tests **mock `call_llm`** (don't hit the real Gemini API in CI). One **opt-in** integration test gated behind `RUN_AI_TESTS=1` for manual prompt-regression checks. | Same approach as spec Section 5. |
| Prompt source | Port the existing prompts from `frontend/src/app/api/ai/*/route.ts` + `frontend/src/app/api/capture/process/route.ts` (the legacy Next.js routes still use Anthropic SDK). Mirror them verbatim into Python prompt modules. | Don't re-invent prompts; they work today. |

---

## File structure (after this plan)

```
backend/
├── app/
│   ├── main.py                       # MODIFIED — include 2 new routers
│   ├── ai.py                         # NEW — call_llm() + parse_json_response()
│   ├── prompts/
│   │   ├── __init__.py               # NEW (empty)
│   │   ├── capture.py                # NEW — CAPTURE_SYSTEM_PROMPT
│   │   ├── generate_plan.py          # NEW — GENERATE_PLAN_SYSTEM_PROMPT
│   │   ├── review.py                 # NEW — REVIEW_SYSTEM_PROMPT
│   │   └── suggest_stack.py          # NEW — SUGGEST_STACK_SYSTEM_PROMPT
│   ├── schemas/
│   │   ├── capture.py                # NEW
│   │   └── ai.py                     # NEW
│   └── routers/
│       ├── capture.py                # NEW — 4 endpoints
│       └── ai.py                     # NEW — 3 endpoints
├── pyproject.toml                    # MODIFIED — adds litellm
└── tests/
    ├── test_routers_capture.py       # NEW
    └── test_routers_ai.py            # NEW (mocked LLM)

frontend/
├── src/
│   ├── app/
│   │   ├── capture/page.tsx                            # MODIFIED — apiServerFetch
│   │   ├── projects/new/page.tsx                       # MODIFIED — /ai/generate-plan via proxy
│   │   └── api/
│   │       ├── ai/{generate-plan,review,suggest-stack}/route.ts   # DELETED at end of phase
│   │       └── capture/process/route.ts                # DELETED at end of phase
│   └── components/
│       └── capture/                                     # MODIFIED — fetches via proxy

docs/
└── migration-mapping.md              # MODIFIED — flip 7 rows to ✅
```

---

## Tasks

### Task 1: Cut branch + sanity check

```bash
cd D:/work-space/task/ProjectHub
git checkout master
git pull origin master
git log -1 --oneline
```

Expected HEAD: `b75598b Merge pull request #5 ...` (or later).

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
```
Expected: 149 tests across 19 files.

```bash
cd ../frontend && npm test 2>&1 | tail -5
```
Expected: 139 tests across 25 files.

```bash
cd ..
git checkout -b feature/backend-phase-6-capture-ai
```

---

### Task 2: Add `litellm` dependency

**File:** `backend/pyproject.toml`

Add `litellm>=1.50,<2` to the `[project] dependencies` array (alphabetically before `psycopg`):

```toml
dependencies = [
    "fastapi>=0.115,<0.117",
    "uvicorn[standard]>=0.30,<0.34",
    "litellm>=1.50,<2",
    "psycopg[pool,binary]>=3.2,<3.3",
    "pydantic[email]>=2.9,<3",
    "pydantic-settings>=2.5,<3",
    "alembic>=1.13,<2",
    "pyjwt>=2.9,<3",
    "bcrypt>=4.2,<5",
]
```

Then:

```bash
cd backend
source .venv/Scripts/activate
pip install -e ".[dev,prod]"
PYTHONIOENCODING=utf-8 python -c "import litellm; print('litellm:', litellm.__version__)"
pytest 2>&1 | tail -3
```

Expected: litellm version printed; 149 tests still pass.

Commit:
```bash
cd ..
git add backend/pyproject.toml
git commit -m "chore(backend): add litellm for Phase 6 AI calls

litellm provides a unified completion() API with built-in
fallback chains. Phase 6 uses gemini/gemini-2.5-flash primary
with gemini/gemini-2.5-flash-lite fallback.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 3: `app/ai.py` LLM wrapper + `app/prompts/*.py`

**Files:**
- Create: `backend/app/ai.py`
- Create: `backend/app/prompts/__init__.py`
- Create: `backend/app/prompts/capture.py`
- Create: `backend/app/prompts/generate_plan.py`
- Create: `backend/app/prompts/review.py`
- Create: `backend/app/prompts/suggest_stack.py`

### Step 1: Port the existing prompts from the Next.js routes

```bash
cd frontend
cat src/app/api/capture/process/route.ts 2>&1 | grep -A 30 "SYSTEM_PROMPT\|system:"
cat src/app/api/ai/generate-plan/route.ts 2>&1 | grep -A 30 "SYSTEM_PROMPT\|system:"
cat src/app/api/ai/review/route.ts 2>&1 | grep -A 30 "SYSTEM_PROMPT\|system:"
cat src/app/api/ai/suggest-stack/route.ts 2>&1 | grep -A 30 "SYSTEM_PROMPT\|system:"
```

Capture each `system:` string verbatim. These become the Python prompt module contents.

### Step 2: Create `backend/app/prompts/__init__.py`

Empty file:

```python
```

### Step 3: Create `backend/app/prompts/capture.py`

Use the system prompt extracted in Step 1 OR — if the legacy file is gone — use this default that matches the prior plan spec:

```python
"""System prompt for /capture/process — parse meeting notes into structured action items."""

CAPTURE_SYSTEM_PROMPT = """You are an AI assistant that parses unstructured meeting notes and voice memos into structured action items.

Extract all actionable items from the input text and return them as a JSON array. Each item must have:
- "type": one of "todo", "follow_up", "commitment", "meeting", "review", "timeline"
- "title": short action title (max 80 chars)
- "description": 1-2 sentence explanation
- "priority": one of "low", "medium", "high", "critical"

Return ONLY valid JSON — an array of objects with those four fields. No markdown, no extra text.

Examples:
- "asked Arjun to finish the doc by Thursday" → type=follow_up, priority=high
- "I need to review Vikram's PR before Friday" → type=review, priority=high
- "set up a deployment timeline for next week" → type=timeline, priority=medium
- "committed to send quarterly report to board by month-end" → type=commitment, priority=high"""
```

### Step 4: Create `backend/app/prompts/generate_plan.py`

If the legacy frontend prompt was extracted in Step 1, paste it verbatim. Otherwise use this default:

```python
"""System prompt for /ai/generate-plan — generate phases + checklist + tech stack from a project requirement."""

GENERATE_PLAN_SYSTEM_PROMPT = """You are a senior engineering leader who plans projects.

Given a project requirement and type (engineering | research), generate a structured plan:

Return a JSON object with these fields:
- "summary": 2-3 sentence project overview
- "phases": array of phase objects with {"phase_name", "checklist": [...item strings]}
- "milestones": array of {"name", "description", "target_day"} (target_day is number of days from start)
- "kill_criteria": array of strings — conditions under which to kill the project
- "risks": array of {"risk", "mitigation", "severity"} (severity: "low" | "medium" | "high")
- "tech_stack": array of strings — recommended technologies

Return ONLY valid JSON. No markdown, no extra text."""
```

### Step 5: Create `backend/app/prompts/review.py`

```python
"""System prompt for /ai/review — generate constructive feedback on a submission."""

REVIEW_SYSTEM_PROMPT = """You are a senior reviewer providing constructive feedback on engineering / research submissions.

Given the submission's title, type, description, and link, write a single feedback paragraph (3-5 sentences) that:
- Acknowledges what was done well
- Identifies one or two concerns or gaps
- Suggests one concrete next step

Be specific and direct. Don't hedge. Don't enumerate; write prose.

Return ONLY the feedback paragraph as plain text. No markdown, no quoting, no preamble."""
```

### Step 6: Create `backend/app/prompts/suggest_stack.py`

```python
"""System prompt for /ai/suggest-stack — suggest tech stack from a project description."""

SUGGEST_STACK_SYSTEM_PROMPT = """You are a pragmatic engineering leader picking a tech stack.

Given a project description, return a JSON array of 4-8 technology names appropriate for the project (programming languages, frameworks, databases, deployment targets). Favor mature, widely-used tools over novelty.

Return ONLY a JSON array of strings. No markdown, no extra text.

Example: ["TypeScript", "Next.js", "PostgreSQL", "Tailwind CSS", "Vercel"]"""
```

### Step 7: Create `backend/app/ai.py`

```python
"""LLM wrapper — LiteLLM with Gemini primary + flash-lite fallback."""

import json
import re
from typing import Any

import litellm

# Quiet down litellm's default debug logging.
litellm.set_verbose = False

PRIMARY_MODEL = "gemini/gemini-2.5-flash"
FALLBACK_MODEL = "gemini/gemini-2.5-flash-lite"


def call_llm(*, system: str, user: str, max_tokens: int = 1024) -> str:
    """Call the LLM with system + user messages; auto-falls back on rate limit / 5xx.

    Returns the assistant message text. Raises whatever litellm raises if both
    primary and fallback fail.
    """
    response = litellm.completion(
        model=PRIMARY_MODEL,
        fallbacks=[FALLBACK_MODEL],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        timeout=60,
    )
    content = response.choices[0].message.content
    return content if content is not None else ""


def parse_json_response(text: str, fallback: Any) -> Any:
    """Strip optional markdown fences and parse JSON. Return fallback on error."""
    cleaned = re.sub(r"^```(?:json)?\n?|\n?```$", "", text.strip(), flags=re.MULTILINE)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        return fallback
```

### Step 8: Smoke check imports

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
from app.ai import call_llm, parse_json_response, PRIMARY_MODEL, FALLBACK_MODEL
from app.prompts.capture import CAPTURE_SYSTEM_PROMPT
from app.prompts.generate_plan import GENERATE_PLAN_SYSTEM_PROMPT
from app.prompts.review import REVIEW_SYSTEM_PROMPT
from app.prompts.suggest_stack import SUGGEST_STACK_SYSTEM_PROMPT
print('all prompt modules + ai helper OK')
print('  primary:', PRIMARY_MODEL)
print('  fallback:', FALLBACK_MODEL)
print('  parse_json_response empty fallback:', parse_json_response('not json', []))
print('  parse_json_response stripping fences:', parse_json_response('\`\`\`json\n[1,2,3]\n\`\`\`', []))
"
pytest 2>&1 | tail -3
```

Expected: all imports succeed; smoke prints model names + parse results; 149 tests still pass.

Commit:
```bash
cd ..
git add backend/app/ai.py backend/app/prompts/
git commit -m "feat(backend): app.ai + prompts modules (LiteLLM + Gemini)

- app/ai.py: call_llm(system, user, max_tokens) uses
  litellm.completion with primary=gemini-2.5-flash,
  fallbacks=[gemini-2.5-flash-lite], timeout=60s
- parse_json_response(text, fallback) strips markdown fences
  and parses JSON; returns fallback on error
- app/prompts/{capture, generate_plan, review, suggest_stack}.py:
  one SYSTEM_PROMPT constant per AI feature

GEMINI_API_KEY env var is picked up automatically by LiteLLM.
If absent, calls raise — routers handle that as 503 in Tasks 4-5.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Pydantic schemas (capture + ai)

**Files:**
- Create: `backend/app/schemas/capture.py`
- Create: `backend/app/schemas/ai.py`

### Step 1: Create `backend/app/schemas/capture.py`

```python
"""Pydantic models for the capture router."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


CaptureItemType = Literal["todo", "follow_up", "commitment", "meeting", "review", "timeline"]
CaptureItemStatus = Literal["pending", "converted", "dismissed"]


class CaptureItemOut(BaseModel):
    id: str
    session_id: str
    type: CaptureItemType
    raw_text: Optional[str] = None
    title: str
    description: Optional[str] = None
    department: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str
    status: CaptureItemStatus
    project_id: Optional[str] = None
    converted_to_type: Optional[str] = None
    converted_to_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class CaptureSessionOut(BaseModel):
    id: str
    user_id: str
    raw_input: str
    created_at: datetime
    items: List[CaptureItemOut] = []


class CaptureProcessRequest(BaseModel):
    """POST /capture/process body."""
    raw_input: str


class CaptureItemUpdate(BaseModel):
    """PATCH /capture/items/{id} body."""
    status: Optional[CaptureItemStatus] = None
    project_id: Optional[str] = None
    converted_to_type: Optional[str] = None
    converted_to_id: Optional[str] = None
```

### Step 2: Create `backend/app/schemas/ai.py`

```python
"""Pydantic models for the AI router."""

from typing import Any, Optional

from pydantic import BaseModel


class GeneratePlanRequest(BaseModel):
    requirement: str
    type: str  # "engineering" | "research"


class GeneratePlanResponse(BaseModel):
    summary: Optional[str] = None
    phases: list = []
    milestones: list = []
    kill_criteria: list = []
    risks: list = []
    tech_stack: list = []


class ReviewRequest(BaseModel):
    submission_title: str
    submission_type: str
    description: Optional[str] = None
    link: Optional[str] = None


class ReviewResponse(BaseModel):
    feedback: str


class SuggestStackRequest(BaseModel):
    description: str


class SuggestStackResponse(BaseModel):
    tech_stack: list
```

### Step 3: Smoke + commit

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
from app.schemas.capture import CaptureSessionOut, CaptureItemOut, CaptureProcessRequest, CaptureItemUpdate
from app.schemas.ai import GeneratePlanRequest, ReviewRequest, SuggestStackRequest
print('schemas OK')
"
pytest 2>&1 | tail -3
```

```bash
cd ..
git add backend/app/schemas/capture.py backend/app/schemas/ai.py
git commit -m "feat(backend): pydantic schemas for capture + ai

- schemas/capture.py: CaptureSessionOut, CaptureItemOut,
  CaptureProcessRequest (raw_input only — user_id from JWT),
  CaptureItemUpdate
- schemas/ai.py: GeneratePlanRequest/Response,
  ReviewRequest/Response, SuggestStackRequest/Response

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: `app/routers/capture.py` + tests (TDD)

**Files:**
- Create: `backend/app/routers/capture.py`
- Create: `backend/tests/test_routers_capture.py`
- Modify: `backend/app/main.py`

**Endpoints:**

| Method | Path | Notes |
|---|---|---|
| GET | `/api/v1/capture/sessions` | any auth; returns caller's own sessions (with items). Optional limit. |
| GET | `/api/v1/capture/sessions/{id}` | any auth; caller's own only. 404 otherwise. |
| POST | `/api/v1/capture/process` | any auth. Calls LLM, INSERT session + items in one transaction. Returns the hydrated session. If LLM fails, session is still created with empty items. |
| PATCH | `/api/v1/capture/items/{id}` | any auth; caller's own items only. Updates status / converted_to / etc. |

### Step 1: Failing test (uses mocked `call_llm`)

```python
"""Integration tests for /api/v1/capture."""

from unittest.mock import patch
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
    return {
        "ceo_id": by_role["ceo"],
        "mem_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "mem_token": issue_access_token(by_role["team_member"], "team_member"),
    }


@patch("app.routers.capture.call_llm")
def test_process_creates_session_with_items(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '[{"type":"todo","title":"Write docs","description":"x","priority":"high"}]'
    resp = client.post(
        "/api/v1/capture/process",
        headers=_bearer(setup["ceo_token"]),
        json={"raw_input": "Need to write the API docs"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["user_id"] == setup["ceo_id"]
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Write docs"


@patch("app.routers.capture.call_llm")
def test_process_empty_items_on_llm_failure(mock_llm, setup: dict, client: TestClient) -> None:
    """If the LLM returns non-JSON, the session is created with an empty items array."""
    mock_llm.return_value = "Sorry, I can't process that"
    resp = client.post(
        "/api/v1/capture/process",
        headers=_bearer(setup["ceo_token"]),
        json={"raw_input": "anything"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["items"] == []


@patch("app.routers.capture.call_llm")
def test_list_sessions_returns_own_only(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = "[]"
    client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                json={"raw_input": "ceo session"})
    client.post("/api/v1/capture/process", headers=_bearer(setup["mem_token"]),
                json={"raw_input": "mem session"})

    resp = client.get("/api/v1/capture/sessions", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 200
    sessions = resp.json()["data"]
    assert all(s["user_id"] == setup["mem_id"] for s in sessions)


@patch("app.routers.capture.call_llm")
def test_get_session_other_user_returns_404(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = "[]"
    create = client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                         json={"raw_input": "ceo session"})
    sid = create.json()["data"]["id"]
    resp = client.get(f"/api/v1/capture/sessions/{sid}", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 404


@patch("app.routers.capture.call_llm")
def test_patch_item_status(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '[{"type":"todo","title":"X","description":"","priority":"low"}]'
    create = client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                         json={"raw_input": "x"})
    item_id = create.json()["data"]["items"][0]["id"]
    resp = client.patch(f"/api/v1/capture/items/{item_id}",
                        headers=_bearer(setup["ceo_token"]),
                        json={"status": "dismissed"})
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "dismissed"


@patch("app.routers.capture.call_llm")
def test_patch_item_other_user_returns_404(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '[{"type":"todo","title":"X","description":"","priority":"low"}]'
    create = client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                         json={"raw_input": "x"})
    item_id = create.json()["data"]["items"][0]["id"]
    resp = client.patch(f"/api/v1/capture/items/{item_id}",
                        headers=_bearer(setup["mem_token"]),
                        json={"status": "dismissed"})
    assert resp.status_code == 404


def test_process_unauth(client: TestClient, db_clean: None) -> None:
    assert client.post("/api/v1/capture/process", json={"raw_input": "x"}).status_code == 401
```

7 tests.

### Step 2: Run, verify fail

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_capture.py -v 2>&1 | tail -10
```

### Step 3: Create `backend/app/routers/capture.py`

```python
"""Capture router — sessions list/get/process, items patch."""

from typing import Optional
from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.ai import call_llm, parse_json_response
from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.prompts.capture import CAPTURE_SYSTEM_PROMPT
from app.responses import ok
from app.schemas.capture import CaptureItemUpdate, CaptureProcessRequest


router = APIRouter(prefix="/api/v1/capture", tags=["capture"])


def _shape_item(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "session_id": str(r["session_id"]),
        "type": r["type"],
        "raw_text": r["raw_text"],
        "title": r["title"],
        "description": r["description"],
        "department": r["department"],
        "due_date": r["due_date"].isoformat() if r["due_date"] else None,
        "priority": r["priority"],
        "status": r["status"],
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "converted_to_type": r["converted_to_type"],
        "converted_to_id": str(r["converted_to_id"]) if r["converted_to_id"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


def _shape_session(r: dict, items: list[dict]) -> dict:
    return {
        "id": str(r["id"]),
        "user_id": str(r["user_id"]),
        "raw_input": r["raw_input"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "items": items,
    }


@router.get("/sessions")
def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, raw_input, created_at
                FROM capture_sessions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user.user_id, limit),
            )
            sessions = cur.fetchall()
            if not sessions:
                return ok(data=[])
            session_ids = [str(s["id"]) for s in sessions]
            cur.execute(
                """
                SELECT id, session_id, type, raw_text, title, description, department,
                       due_date, priority, status, project_id, converted_to_type,
                       converted_to_id, created_at, updated_at
                FROM capture_items
                WHERE session_id = ANY(%s)
                ORDER BY created_at
                """,
                (session_ids,),
            )
            items_by_session: dict[str, list[dict]] = {}
            for r in cur.fetchall():
                items_by_session.setdefault(str(r["session_id"]), []).append(_shape_item(r))
    return ok(data=[_shape_session(s, items_by_session.get(str(s["id"]), [])) for s in sessions])


@router.get("/sessions/{session_id}")
def get_session(session_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, raw_input, created_at
                FROM capture_sessions WHERE id = %s
                """,
                (str(session_id),),
            )
            row = cur.fetchone()
            if row is None or str(row["user_id"]) != user.user_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Session not found")
            cur.execute(
                """
                SELECT id, session_id, type, raw_text, title, description, department,
                       due_date, priority, status, project_id, converted_to_type,
                       converted_to_id, created_at, updated_at
                FROM capture_items WHERE session_id = %s
                ORDER BY created_at
                """,
                (str(session_id),),
            )
            items = [_shape_item(r) for r in cur.fetchall()]
    return ok(data=_shape_session(row, items))


@router.post("/process")
def process_capture(
    payload: CaptureProcessRequest, user: CurrentUser = Depends(get_current_user)
) -> dict:
    """Parse raw input via LLM and save session + items atomically."""
    raw_input = payload.raw_input.strip()
    if not raw_input:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="raw_input is required")

    # Call LLM; on any failure, fall back to empty items array so the session is still saved
    try:
        llm_text = call_llm(system=CAPTURE_SYSTEM_PROMPT, user=raw_input, max_tokens=1024)
        parsed = parse_json_response(llm_text, fallback=[])
        if not isinstance(parsed, list):
            parsed = []
    except Exception:
        parsed = []

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO capture_sessions (user_id, raw_input)
                VALUES (%s, %s)
                RETURNING id, user_id, raw_input, created_at
                """,
                (user.user_id, raw_input),
            )
            session_row = cur.fetchone()
            assert session_row is not None
            session_id = str(session_row["id"])
            items: list[dict] = []
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                cur.execute(
                    """
                    INSERT INTO capture_items
                      (session_id, type, raw_text, title, description, priority, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                    RETURNING id, session_id, type, raw_text, title, description, department,
                              due_date, priority, status, project_id, converted_to_type,
                              converted_to_id, created_at, updated_at
                    """,
                    (
                        session_id,
                        item.get("type", "todo"),
                        raw_input,
                        item.get("title", "Untitled"),
                        item.get("description", ""),
                        item.get("priority", "medium"),
                    ),
                )
                new_item = cur.fetchone()
                assert new_item is not None
                items.append(_shape_item(new_item))
        conn.commit()
    return ok(data=_shape_session(session_row, items), message="Created")


@router.patch("/items/{item_id}")
def update_item(
    item_id: UUID,
    payload: CaptureItemUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Verify ownership via the parent session
            cur.execute(
                """
                SELECT s.user_id
                FROM capture_items i JOIN capture_sessions s ON i.session_id = s.id
                WHERE i.id = %s
                """,
                (str(item_id),),
            )
            row = cur.fetchone()
            if row is None or str(row["user_id"]) != user.user_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Item not found")
            set_pairs = [f"{k} = %({k})s" for k in fields]
            params: dict = {**fields, "__id": str(item_id)}
            sql = (
                f"UPDATE capture_items SET {', '.join(set_pairs)}, updated_at = now() "
                f"WHERE id = %(__id)s "
                f"RETURNING id, session_id, type, raw_text, title, description, department, "
                f"          due_date, priority, status, project_id, converted_to_type, "
                f"          converted_to_id, created_at, updated_at"
            )
            cur.execute(sql, params)
            updated = cur.fetchone()
            assert updated is not None
        conn.commit()
    return ok(data=_shape_item(updated))
```

### Step 4: Wire into `backend/app/main.py`

Add `capture` to the router imports alphabetically and include it:

```python
from app.routers import (
    ai, auth, capture, checkpoints, extensions, feedback, health, inbox, leaves,
    phases, projects, submissions, tasks, users,
)
```

Wait — `ai` doesn't exist yet (Task 6). For now just add `capture`. We'll re-edit when Task 6 adds `ai`.

```python
from app.routers import (
    auth, capture, checkpoints, extensions, feedback, health, inbox, leaves,
    phases, projects, submissions, tasks, users,
)
```

After `app.include_router(inbox.router)`:
```python
app.include_router(capture.router)
```

### Step 5: Run tests + commit

```bash
pytest tests/test_routers_capture.py -v 2>&1 | tail -15
pytest -v 2>&1 | tail -5
```

Expected: 7 capture tests pass; full suite 156 (149 + 7).

```bash
cd ..
git add backend/app/routers/capture.py backend/app/main.py backend/tests/test_routers_capture.py
git commit -m "feat(backend): capture router — sessions + items + LLM parse

- GET /api/v1/capture/sessions — caller's own sessions (with items).
  Limit query param (default 20, max 100).
- GET /api/v1/capture/sessions/{id} — 404 on other users' sessions.
- POST /api/v1/capture/process — calls LLM via app.ai.call_llm
  with the capture system prompt. Inserts session + parsed items
  in one transaction. On LLM failure (network, parse error, etc.)
  the session is still saved with items=[]; caller can retry.
- PATCH /api/v1/capture/items/{id} — ownership check via parent
  session; 404 on other users' items. Updates status / project_id /
  converted_to_* fields. 400 on empty body.

Tests mock app.routers.capture.call_llm so no real Gemini calls
in CI. 7 tests cover happy path, LLM-failure fallback, ownership
404 on both sessions and items, and 401 unauthenticated.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: `app/routers/ai.py` + tests (TDD; mocked LLM)

**Files:**
- Create: `backend/app/routers/ai.py`
- Create: `backend/tests/test_routers_ai.py`
- Modify: `backend/app/main.py`

**Endpoints (all CEO-only):**

| Method | Path | Notes |
|---|---|---|
| POST | `/api/v1/ai/generate-plan` | body: `{requirement, type}`. Returns parsed JSON plan. |
| POST | `/api/v1/ai/review` | body: `{submission_title, submission_type, description?, link?}`. Returns `{feedback: "..."}`. |
| POST | `/api/v1/ai/suggest-stack` | body: `{description}`. Returns `{tech_stack: [...]}`. |

### Step 1: Failing test

```python
"""Integration tests for /api/v1/ai/*."""

from unittest.mock import patch
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
    return {
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "mem_token": issue_access_token(by_role["team_member"], "team_member"),
    }


@patch("app.routers.ai.call_llm")
def test_generate_plan_returns_parsed_json(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '{"summary":"x","phases":[],"milestones":[],"kill_criteria":[],"risks":[],"tech_stack":["py"]}'
    resp = client.post(
        "/api/v1/ai/generate-plan",
        headers=_bearer(setup["ceo_token"]),
        json={"requirement": "Build a payment system", "type": "engineering"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["summary"] == "x"
    assert data["tech_stack"] == ["py"]


def test_generate_plan_team_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/ai/generate-plan",
        headers=_bearer(setup["mem_token"]),
        json={"requirement": "x", "type": "engineering"},
    )
    assert resp.status_code == 403


@patch("app.routers.ai.call_llm")
def test_review_returns_feedback(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = "This looks solid; consider adding error tests."
    resp = client.post(
        "/api/v1/ai/review",
        headers=_bearer(setup["ceo_token"]),
        json={"submission_title": "Auth doc", "submission_type": "document"},
    )
    assert resp.status_code == 200
    assert "solid" in resp.json()["data"]["feedback"]


def test_review_team_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/ai/review",
        headers=_bearer(setup["mem_token"]),
        json={"submission_title": "x", "submission_type": "document"},
    )
    assert resp.status_code == 403


@patch("app.routers.ai.call_llm")
def test_suggest_stack_returns_array(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '["TypeScript","Next.js","Postgres"]'
    resp = client.post(
        "/api/v1/ai/suggest-stack",
        headers=_bearer(setup["ceo_token"]),
        json={"description": "An internal CRM"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["tech_stack"] == ["TypeScript", "Next.js", "Postgres"]


def test_unauth_returns_401(client: TestClient, db_clean: None) -> None:
    resp = client.post("/api/v1/ai/generate-plan", json={"requirement": "x", "type": "engineering"})
    assert resp.status_code == 401
```

6 tests.

### Step 2: Run, verify fail

```bash
pytest tests/test_routers_ai.py -v 2>&1 | tail -10
```

### Step 3: Create `backend/app/routers/ai.py`

```python
"""AI router — stateless LLM endpoints. CEO-only."""

from fastapi import APIRouter, Depends

from app.ai import call_llm, parse_json_response
from app.auth import require_roles
from app.prompts.generate_plan import GENERATE_PLAN_SYSTEM_PROMPT
from app.prompts.review import REVIEW_SYSTEM_PROMPT
from app.prompts.suggest_stack import SUGGEST_STACK_SYSTEM_PROMPT
from app.responses import ok
from app.schemas.ai import GeneratePlanRequest, ReviewRequest, SuggestStackRequest


router = APIRouter(prefix="/api/v1/ai", tags=["ai"], dependencies=[Depends(require_roles("ceo"))])


@router.post("/generate-plan")
def generate_plan(payload: GeneratePlanRequest) -> dict:
    user_msg = f"Project type: {payload.type}\n\nRequirement:\n{payload.requirement}"
    text = call_llm(system=GENERATE_PLAN_SYSTEM_PROMPT, user=user_msg, max_tokens=2048)
    parsed = parse_json_response(text, fallback={
        "summary": "",
        "phases": [],
        "milestones": [],
        "kill_criteria": [],
        "risks": [],
        "tech_stack": [],
    })
    if not isinstance(parsed, dict):
        parsed = {
            "summary": "",
            "phases": [],
            "milestones": [],
            "kill_criteria": [],
            "risks": [],
            "tech_stack": [],
        }
    return ok(data=parsed)


@router.post("/review")
def review(payload: ReviewRequest) -> dict:
    user_msg = (
        f"Title: {payload.submission_title}\n"
        f"Type: {payload.submission_type}\n"
        f"Description: {payload.description or '(none)'}\n"
        f"Link: {payload.link or '(none)'}"
    )
    text = call_llm(system=REVIEW_SYSTEM_PROMPT, user=user_msg, max_tokens=512)
    return ok(data={"feedback": text.strip()})


@router.post("/suggest-stack")
def suggest_stack(payload: SuggestStackRequest) -> dict:
    text = call_llm(system=SUGGEST_STACK_SYSTEM_PROMPT, user=payload.description, max_tokens=512)
    parsed = parse_json_response(text, fallback=[])
    if not isinstance(parsed, list):
        parsed = []
    return ok(data={"tech_stack": parsed})
```

### Step 4: Wire into `backend/app/main.py`

Now add `ai` alphabetically:
```python
from app.routers import (
    ai, auth, capture, checkpoints, extensions, feedback, health, inbox, leaves,
    phases, projects, submissions, tasks, users,
)
```

After `app.include_router(capture.router)`:
```python
app.include_router(ai.router)
```

### Step 5: Run tests + commit

```bash
pytest tests/test_routers_ai.py -v 2>&1 | tail -10
pytest -v 2>&1 | tail -5
```

Expected: 6 ai tests pass; full suite 162 (156 + 6).

```bash
cd ..
git add backend/app/routers/ai.py backend/app/main.py backend/tests/test_routers_ai.py
git commit -m "feat(backend): ai router — generate-plan/review/suggest-stack (CEO-only)

- POST /api/v1/ai/generate-plan — body {requirement, type}.
  Returns parsed JSON plan (summary, phases, milestones,
  kill_criteria, risks, tech_stack).
- POST /api/v1/ai/review — body {submission_title,
  submission_type, description?, link?}. Returns
  {feedback: 'plain-text paragraph'}.
- POST /api/v1/ai/suggest-stack — body {description}.
  Returns {tech_stack: [...]}.

All three are CEO-only (mounted with require_roles('ceo')
dependency at the router level). Tests mock app.routers.ai.call_llm
so no Gemini API calls in CI.

6 integration tests cover happy paths, the role guard, and 401.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 7: Backend smoke test (optional — needs real GEMINI_API_KEY)

If you have a Gemini API key set in `backend/.env.local`, run a quick smoke against the live LLM. Otherwise skip this task.

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --port 8000 &
UV=$!
sleep 4
LOGIN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"ceo@projecthub.dev","password":"projecthub-dev"}')
ACCESS=$(echo "$LOGIN" | python -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")

echo "=== suggest-stack ==="
curl -s -X POST http://localhost:8000/api/v1/ai/suggest-stack \
    -H "Authorization: Bearer $ACCESS" \
    -H "Content-Type: application/json" \
    -d '{"description":"A simple internal CRM"}' | python -m json.tool | head -10

echo "=== capture/process ==="
curl -s -X POST http://localhost:8000/api/v1/capture/process \
    -H "Authorization: Bearer $ACCESS" \
    -H "Content-Type: application/json" \
    -d '{"raw_input":"Need to ask Arjun about the API docs by Thursday. Meeting with data team next Monday."}' \
    | python -m json.tool | head -30

kill $UV 2>/dev/null
wait 2>/dev/null
cd ..
```

If `GEMINI_API_KEY` is missing → endpoints return 500 / 503 (LiteLLM raises). That's expected without a key; not a regression.

This is verification-only — no commit.

---

### Task 8: Frontend — migrate `/capture` page + form

**Files:** modify `frontend/src/app/capture/page.tsx` + the client components under `frontend/src/components/capture/` (if any) that submit raw input and render results.

### Step 1: Inventory

```bash
cd frontend
grep -rn '"/api/capture' src/ 2>&1 | grep -v "__tests__"
cat src/app/capture/page.tsx 2>&1 | head -60
ls src/components/capture/ 2>&1
```

### Step 2: Migrate page data fetch

Server Component change: load capture sessions via `apiServerFetch<CaptureSessionOut[]>("/api/v1/capture/sessions")`. Define the type matching backend:

```typescript
type CaptureItem = {
  id: string;
  session_id: string;
  type: "todo" | "follow_up" | "commitment" | "meeting" | "review" | "timeline";
  raw_text: string | null;
  title: string;
  description: string | null;
  department: string | null;
  due_date: string | null;
  priority: string;
  status: "pending" | "converted" | "dismissed";
  project_id: string | null;
  converted_to_type: string | null;
  converted_to_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type CaptureSession = {
  id: string;
  user_id: string;
  raw_input: string;
  created_at: string;
  items: CaptureItem[];
};
```

### Step 3: Migrate the process form (client component)

`fetch("/api/capture/process", ...)` → `fetch("/api/proxy/v1/capture/process", ...)`:

```typescript
const res = await fetch("/api/proxy/v1/capture/process", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ raw_input: rawInput }),
});
const envelope = await res.json().catch(() => null);
if (!res.ok || envelope?.status !== "success") {
  setError(envelope?.message ?? "Failed to process");
  return;
}
router.refresh();
```

### Step 4: Migrate item-update (status toggle, dismiss, etc.) if such UI exists

```typescript
const res = await fetch(`/api/proxy/v1/capture/items/${itemId}`, {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "dismissed" }),
});
```

### Step 5: Update JSX field references

Backend uses snake_case (`raw_input`, `created_at`, `session_id`, `due_date`, etc.). Either adapter or inline rename — pick smallest diff.

### Step 6: tsc + tests + commit

```bash
npx tsc --noEmit 2>&1 | tail -15
npm test 2>&1 | tail -10
cd ..
git add -A frontend/
git commit -m "refactor(frontend): /capture migrates to FastAPI

- Server Component: apiServerFetch<CaptureSession[]>(/api/v1/capture/sessions)
- Process form (client): POST /api/proxy/v1/capture/process with
  {raw_input}; envelope unwrap; router.refresh()
- Item-update flow (if present): PATCH /api/proxy/v1/capture/items/{id}
- Field references updated to snake_case (or adapter in page.tsx)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Frontend — migrate `/projects/new` AI plan generation

**Files:** `frontend/src/app/projects/new/page.tsx` (or wizard component)

```bash
grep -rn '"/api/ai/generate-plan' src/ 2>&1 | grep -v "__tests__"
```

Replace each `fetch("/api/ai/generate-plan", ...)` with `fetch("/api/proxy/v1/ai/generate-plan", ...)`. The request body might already match (`{requirement, type}`) — check the legacy code and the new schema's `GeneratePlanRequest`. Adapt if needed.

The response goes from raw JSON (or whatever the Next.js route returned) to the FastAPI envelope `{status, message, data: {summary, phases, milestones, ...}}`. Update the unwrap step.

Also check if `/api/ai/suggest-stack` is used in the wizard. If so, migrate it the same way.

tsc + tests + commit:

```bash
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -10
cd ..
git add -A frontend/
git commit -m "refactor(frontend): /projects/new AI generate-plan + suggest-stack via proxy

- /api/ai/generate-plan → /api/proxy/v1/ai/generate-plan
- /api/ai/suggest-stack → /api/proxy/v1/ai/suggest-stack (if used)
- Response envelope unwrapped (envelope.data is the plan/stack)

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 10: Frontend — migrate reviews-tab AI feedback

**Files:** `frontend/src/components/reviews/submission-sheet-content.tsx` or wherever the "Generate AI review" button lives.

```bash
grep -rn '"/api/ai/review' src/ 2>&1 | grep -v "__tests__"
```

Replace with `/api/proxy/v1/ai/review`. Request body becomes `{submission_title, submission_type, description, link}`. Response unwrap gets `envelope.data.feedback`.

tsc + tests + commit (similar to Task 9).

---

### Task 11: Delete dead Next.js routes

**Files to delete (if they exist):**
- `frontend/src/app/api/capture/process/route.ts`
- `frontend/src/app/api/ai/generate-plan/route.ts`
- `frontend/src/app/api/ai/review/route.ts`
- `frontend/src/app/api/ai/suggest-stack/route.ts`

```bash
cd frontend
grep -rn '"/api/capture/process\|"/api/ai/' src/ 2>&1 | grep -v "__tests__"
```

If clean, delete the 4 files. Verify tsc + tests, commit.

After Phase 6 cleanup, `frontend/src/app/api/` should contain ONLY `auth/` and `proxy/`. Phase 7's job is then to delete Prisma + dev.db + `prisma/seed.ts` etc.

---

### Task 12: E2E smoke + migration-mapping + push

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -5
cd ../frontend && npm test 2>&1 | tail -5
```

Expected: backend ~162, frontend ~139.

Update `docs/migration-mapping.md` — flip the 7 Phase 6 rows from ⏳ to ✅.

```bash
cd ..
git add docs/migration-mapping.md
git commit -m "docs(migration): mark Phase 6 routes as done

Capture + AI routers all live. /capture page + /projects/new
wizard + reviews-tab AI feedback all consume FastAPI through
the proxy.

End-of-Phase-6 state:
- Backend: ~162 tests across 21 files (+13 from Phase 6:
  7 capture + 6 ai)
- Frontend: ~139 tests
- frontend/src/app/api/ contains only auth/ + proxy/
- Every domain runs on FastAPI; Prisma is no longer used at
  runtime for any feature.

Phase 7 will delete Prisma + dev.db + the prisma/ directory.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push -u origin feature/backend-phase-6-capture-ai
```

---

## Acceptance criteria

When all tasks complete:

1. Branch `feature/backend-phase-6-capture-ai` exists with ~10-12 commits, pushed.
2. `cd backend && pytest -v` → ~162 tests pass across 21 files.
3. `cd frontend && npm test` → ~139 tests pass.
4. `cd backend && uvicorn app.main:app --port 8000` boots; OpenAPI shows the 7 new endpoints.
5. **Manual flow**: with a valid `GEMINI_API_KEY`, the `/capture` page parses notes → items via Gemini; the `/projects/new` wizard generates a plan; reviews tab generates an AI review.
6. `frontend/src/app/api/` contains exactly `auth/` and `proxy/` directories.
7. `docs/migration-mapping.md` shows all rows as ✅.

## Out of scope (deferred)

- Phase 7: delete Prisma + dev.db + frontend/prisma/ + Prisma adapters + the unused query helpers.
- Phase 8: production deployment + CI/CD.
- Streaming AI responses (SSE).
- Prompt caching.
- Capture-item → task conversion endpoint (would naturally take `converted_to_type=task` and create a real task row).
