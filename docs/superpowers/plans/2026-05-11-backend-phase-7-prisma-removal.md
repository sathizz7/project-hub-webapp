# Phase 7 — Delete Prisma + dev.db Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove every trace of Prisma + SQLite from the `frontend/` package so it's a pure FastAPI consumer. After this phase, no Prisma client, no `dev.db`, no `prisma/` directory, no `@prisma/*` packages, no `src/lib/prisma.ts`, no `src/lib/queries/*` Prisma helpers, and no Prisma-backed tests.

**Architecture:** Three Server Components still read directly from Prisma — `/reviews`, `/team/[id]`, and the CEO Command Center (`/`). Each one must be ported to call FastAPI via `apiServerFetch<T>()`. Once those callers + the helper modules that back them are removed, the entire `frontend/prisma/`, `frontend/src/generated/prisma/`, `frontend/src/lib/prisma.ts`, `frontend/src/lib/queries/*` tree can be deleted along with the package.json deps and the seed script.

**Tech Stack:** Next.js 16 Server Components, `apiServerFetch<T>()` (already implemented in `src/lib/api.ts`), FastAPI endpoints (all live from Phases 2–6).

**Spec source:** `docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md` (post-cutover state — frontend is a pure consumer).
**Branch:** `feature/backend-phase-7-prisma-removal` cut from `master` (commit `6047df2`, post Phase 6 merge).
**Repo:** `https://github.com/sathizz7/project-hub-webapp.git`

---

## State snapshot — what's still on Prisma

**Server Components calling Prisma directly:**
| File | Lines | What it reads |
|---|---|---|
| `frontend/src/app/reviews/page.tsx` | 39 | All submissions with project + phase + user + feedback (CEO review queue) |
| `frontend/src/app/team/[id]/page.tsx` | 85 | One user, their submissions, performance metrics, tasks-for-user, upcoming-leaves-for-user |
| `frontend/src/components/landing/ceo-command-center.tsx` | 198 | Projects, tasks, user count, completed-project count + helpers (action inbox, active leaves, overdue tasks) |

**Prisma-backed query helpers (`frontend/src/lib/queries/*`):**
- `capture.ts` — `getRecentCaptureSessions`, `getPendingCaptureItems`
- `extensions.ts` — extension queries (used by inbox aggregator helper)
- `inbox.ts` — `getActionInbox`, `getActiveLeaves`, `getOverdueTasks`, types `ReviewInboxItem` / `CaptureInboxItem` / `ExtensionInboxItem`
- `leaves.ts` — leave queries (used by inbox helper + team page)
- `performance.ts` — `computePerformanceMetrics` (call sites: team list + team detail)
- `tasks.ts` — `getTasksForUser`, etc.

**Prisma infrastructure to delete:**
- `frontend/src/lib/prisma.ts` — Prisma client singleton
- `frontend/prisma/` — entire directory (schema.prisma, seed.ts, seed.mts, migrations/, test-*.db x 4)
- `frontend/src/generated/prisma/` — generated client (~30+ files)
- `frontend/dev.db` — SQLite dev DB
- `frontend/src/lib/__tests__/_helpers/test-db.{ts,test.ts}` — Prisma test helpers
- `package.json` deps: `prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3`, `@prisma/adapter-libsql`
- `package.json` script: `"seed": "npx tsx prisma/seed.mts"`

**Tests that will be deleted** (they're Prisma-coupled by design, ~6 files):
- `frontend/src/lib/queries/__tests__/capture.test.ts`
- `frontend/src/lib/queries/__tests__/extensions.test.ts`
- `frontend/src/lib/queries/__tests__/inbox.test.ts`
- `frontend/src/lib/queries/__tests__/leaves.test.ts`
- `frontend/src/lib/queries/__tests__/performance.test.ts`
- `frontend/src/lib/queries/__tests__/tasks.test.ts`

Current frontend baseline: **139 tests across 25 files**. After Phase 7 we expect ~115–125 tests across ~19 files (drop the 6 Prisma-suite files).

---

## Decisions locked

| Topic | Decision | Why |
|---|---|---|
| Port order | Server Components first (callers), then helpers, then infra | Each step keeps `tsc` + tests green; lets us bail out cleanly |
| `computePerformanceMetrics` | Re-implement in `frontend/src/lib/performance.ts` calling FastAPI (`/api/v1/users/{id}/tasks`, `/api/v1/users/{id}/submissions`) | Used by team list + team detail; backend already has the data |
| Action-inbox types (`ReviewInboxItem` etc.) | Move type defs into `src/components/landing/ceo-command-center.tsx` or a new `src/lib/inbox-types.ts` | Types are still useful; backend `/api/v1/inbox` already returns this shape |
| Backend endpoint gaps | Add `GET /api/v1/users/{id}/submissions` + `GET /api/v1/users/{id}/tasks` if not already present | Avoid frontend-side N+1 — already do this for team list via in-loop calls; consolidate. |
| Test deletion | Delete the 6 Prisma-suite files in one commit, not piecemeal | They test code we're deleting; piecemeal leaves a broken state |
| `dev.db` | `git rm` it, add to `.gitignore` if not already | It was already gitignored in some places but is in the working tree; clean state |
| `node_modules` | Don't touch — `npm install` after package.json edit handles removal | Reproducible across machines |
| TypeScript strictness | Keep `apiServerFetch<T>()` everywhere; never use `any` for backend responses | The whole point is type-safe consumer |

---

## File structure

**Created:**
- `frontend/src/lib/performance.ts` — replacement for `src/lib/queries/performance.ts`, calls FastAPI
- `frontend/src/lib/inbox-types.ts` — `ReviewInboxItem`, `CaptureInboxItem`, `ExtensionInboxItem` type defs only (moved out of `src/lib/queries/inbox.ts`)

**Modified:**
- `frontend/src/app/reviews/page.tsx` — switch to `apiServerFetch<SubmissionRow[]>("/api/v1/submissions?include=feedback,project,phase,user")`
- `frontend/src/app/team/[id]/page.tsx` — switch to `apiServerFetch` for user + submissions + tasks + leaves
- `frontend/src/components/landing/ceo-command-center.tsx` — switch all 4 Prisma calls to FastAPI (projects, tasks, user count, completed project count) + use existing `/api/v1/inbox` aggregator
- `frontend/src/app/team/page.tsx` — only change is the `performance.ts` import path
- `frontend/package.json` — remove the 4 prisma deps + the `seed` script
- `docs/migration-mapping.md` — add a "Prisma removed in Phase 7" annotation row
- `frontend/.gitignore` — ensure `dev.db` + `prisma/test-*.db` are listed
- `backend/app/routers/users.py` — IF needed, add `GET /users/{id}/submissions` + `GET /users/{id}/tasks` for the team-detail page

**Deleted:**
- `frontend/src/lib/prisma.ts`
- `frontend/src/lib/queries/` (entire directory — 7 .ts files + __tests__ subdir)
- `frontend/src/lib/__tests__/_helpers/test-db.ts` + `test-db.test.ts`
- `frontend/prisma/` (entire directory)
- `frontend/src/generated/prisma/` (entire directory)
- `frontend/dev.db`

---

## Shared types (referenced across multiple tasks)

```typescript
// src/lib/inbox-types.ts (new, replaces types from src/lib/queries/inbox.ts)

export type ReviewInboxItem = {
  id: string;
  title: string;
  type: string;
  createdAt: string;
  project: { id: string; title: string };
  user: { id: string; name: string; avatarColor: string };
};

export type CaptureInboxItem = {
  id: string;
  title: string;
  description: string | null;
  priority: string;
  type: string;
  createdAt: string;
};

export type ExtensionInboxItem = {
  id: string;
  reason: string;
  requestedDeadline: string;
  escalationLevel: number;
  project: { id: string; title: string } | null;
  task: { id: string; title: string } | null;
  requestedBy: { id: string; name: string; avatarColor: string };
};
```

---

## Tasks

### Task 1: Cut branch + audit

- [ ] **Step 1: Branch from master**

```bash
cd D:/work-space/task/ProjectHub
git checkout master && git pull
git checkout -b feature/backend-phase-7-prisma-removal
```

- [ ] **Step 2: Sanity baseline**

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -3
cd ../frontend && npm test 2>&1 | tail -3
```

Expected: backend 162 tests pass, frontend 139 tests pass.

Re-seed the dev DB after running backend tests:
```bash
cd ../backend && source .venv/Scripts/activate && python -m scripts.seed
```

- [ ] **Step 3: Re-audit the Prisma surface**

```bash
cd ..
grep -rln "@/lib/prisma\|@/lib/queries\|@prisma" frontend/src/ 2>/dev/null \
  | grep -v "node_modules\|\.next\|generated/prisma\|__tests__"
```

Expected output (exact set we'll port):
```
frontend/src/app/reviews/page.tsx
frontend/src/app/team/[id]/page.tsx
frontend/src/app/team/page.tsx
frontend/src/components/landing/ceo-command-center.tsx
frontend/src/lib/prisma.ts
frontend/src/lib/queries/capture.ts
frontend/src/lib/queries/extensions.ts
frontend/src/lib/queries/inbox.ts
frontend/src/lib/queries/leaves.ts
frontend/src/lib/queries/performance.ts
frontend/src/lib/queries/tasks.ts
```

If extra files appear (e.g. someone added a new Prisma caller since the plan was written), update the task list before proceeding.

---

### Task 2: Backend gap-fill — user-scoped submissions + tasks

**Files:**
- Modify: `backend/app/routers/users.py`
- Modify: `backend/tests/test_routers_users.py`

**Endpoints to confirm or add:**
- `GET /api/v1/users/{user_id}/submissions` — submissions where `user_id` is the author
- `GET /api/v1/users/{user_id}/tasks` — tasks where `user_id` is the assignee

If both already exist (check `GET /api/v1/my/tasks` — it scopes by JWT, not by path param), add the path-param variants for CEO viewing other users' work.

- [ ] **Step 1: Check what's there**

```bash
cd backend && source .venv/Scripts/activate
grep -n "user_id\|submissions\|tasks" app/routers/users.py | head -20
```

- [ ] **Step 2 (TDD): Failing tests**

Add to `tests/test_routers_users.py`:

```python
def test_get_user_submissions_as_ceo(setup, client):
    # CEO can list any user's submissions
    resp = client.get(f"/api/v1/users/{setup['mem_id']}/submissions",
                      headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


def test_get_user_tasks_as_ceo(setup, client):
    resp = client.get(f"/api/v1/users/{setup['mem_id']}/tasks",
                      headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    assert isinstance(resp.json()["data"], list)


def test_get_other_user_submissions_as_team_member_forbidden(setup, client):
    # member can only fetch their own
    resp = client.get(f"/api/v1/users/{setup['ceo_id']}/submissions",
                      headers=_bearer(setup["mem_token"]))
    assert resp.status_code in (403, 404)
```

Run + confirm fail:
```bash
pytest tests/test_routers_users.py::test_get_user_submissions_as_ceo -v 2>&1 | tail -10
```

- [ ] **Step 3: Add the endpoints in `app/routers/users.py`**

Use the same pattern as `/api/v1/submissions` filtered by `user_id`. Scoping rule:
- CEO can fetch any user's submissions + tasks.
- Team member can only fetch their own (403 otherwise).

```python
@router.get("/{user_id}/submissions")
def list_user_submissions(
    user_id: UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    if user.role_type != "ceo" and str(user_id) != user.user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Forbidden")
    # ... same SELECT as /submissions but scoped to user_id
    return ok(data=[...])
```

Same shape for `tasks`.

- [ ] **Step 4: Re-run, commit**

```bash
pytest 2>&1 | tail -3   # expect 165 (162 + 3)
cd ..
git add backend/app/routers/users.py backend/tests/test_routers_users.py
git commit -m "feat(backend): user-scoped submissions + tasks endpoints

- GET /api/v1/users/{user_id}/submissions: CEO can list any user's
  submissions; team member can list only their own (403 otherwise)
- GET /api/v1/users/{user_id}/tasks: same scoping
- 3 integration tests cover CEO read + member read of own + member
  attempt at other user's submissions

Used by the new frontend /team/[id] page (Phase 7 Prisma cutover)
to replace direct Prisma queries.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

After test run, re-seed:
```bash
cd backend && source .venv/Scripts/activate && python -m scripts.seed && cd ..
```

---

### Task 3: New `src/lib/performance.ts` (FastAPI-backed)

**Files:**
- Create: `frontend/src/lib/performance.ts`
- (Defer deletion of `src/lib/queries/performance.ts` until Task 7)

The old `computePerformanceMetrics(userId)` was Prisma-direct: counted completed tasks, on-time submissions, etc. The new one calls FastAPI.

- [ ] **Step 1: Inspect the old signature + return type**

```bash
cat frontend/src/lib/queries/performance.ts
```

Note the exact return type. Match it byte-for-byte so callers don't need to change.

- [ ] **Step 2: Create `frontend/src/lib/performance.ts`**

```typescript
import { apiServerFetch } from "@/lib/api";

export type PerformanceMetrics = {
  tasksTotal: number;
  tasksCompleted: number;
  submissionsTotal: number;
  // ... whatever fields the old helper returned — copy verbatim
};

type TaskRow = { id: string; status: string; completed_at: string | null };
type SubmissionRow = { id: string; created_at: string };

export async function computePerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
  const [tasks, submissions] = await Promise.all([
    apiServerFetch<TaskRow[]>(`/api/v1/users/${userId}/tasks`),
    apiServerFetch<SubmissionRow[]>(`/api/v1/users/${userId}/submissions`),
  ]);

  return {
    tasksTotal: tasks.length,
    tasksCompleted: tasks.filter(t => t.status === "completed").length,
    submissionsTotal: submissions.length,
    // ... compute the same metrics the old version did
  };
}
```

- [ ] **Step 3: Update callers' import path**

```bash
grep -rln "from \"@/lib/queries/performance\"\|from \"@/lib/queries\".*performance" frontend/src/
```

For each match, change to `from "@/lib/performance"`.

- [ ] **Step 4: tsc + tests + commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -3
cd ..
git add frontend/src/lib/performance.ts frontend/src/app/team/page.tsx frontend/src/app/team/\[id\]/page.tsx
git commit -m "feat(frontend): src/lib/performance.ts (FastAPI-backed)

Replaces the Prisma helper at src/lib/queries/performance.ts.
Calls GET /api/v1/users/{id}/tasks + /submissions and computes
the same metrics shape the old helper returned, so callers
(team list + team detail) need only an import-path change.

Old Prisma helper stays in place until Task 7 to keep tsc green
across the multi-step cutover.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 4: Port `/reviews` to FastAPI

**File:** `frontend/src/app/reviews/page.tsx`

The page currently calls `prisma.submission.findMany({ include: { feedback, project, phase, user } })`. The backend `GET /api/v1/submissions` already returns hydrated submissions including feedback (verify against `app/routers/submissions.py`).

- [ ] **Step 1: Read current implementation + match the shape**

```bash
cat frontend/src/app/reviews/page.tsx
```

Note exactly which fields are read by `<ReviewsClient>`. The new fetch must match snake_case → camelCase or pass through as-is.

- [ ] **Step 2: Verify the backend response shape**

```bash
curl -s http://localhost:8000/api/v1/submissions \
  -H "Authorization: Bearer $ACCESS" | python -m json.tool | head -50
```

(Get `$ACCESS` via the standard login curl from earlier.)

- [ ] **Step 3: Replace the Prisma call**

```typescript
import { apiServerFetch } from "@/lib/api";
import { ReviewsClient } from "@/components/reviews-client";

type BackendSubmission = {
  id: string;
  title: string;
  type: string;
  description: string | null;
  link: string | null;
  status: string;
  created_at: string;
  project: { id: string; title: string };
  phase: { id: string; phase_name: string };
  user: { id: string; name: string; avatar_color: string };
  feedback: Array<{
    id: string;
    text: string;
    is_ai: boolean;
    created_at: string;
    from_user: { id: string; name: string; avatar_color: string } | null;
  }>;
};

export default async function ReviewsPage() {
  const rows = await apiServerFetch<BackendSubmission[]>("/api/v1/submissions");

  // Adapter to the camelCase shape <ReviewsClient> expects
  const submissions = rows.map(s => ({
    id: s.id,
    title: s.title,
    type: s.type,
    description: s.description,
    createdAt: s.created_at,
    project: s.project,
    phase: { id: s.phase.id, phaseName: s.phase.phase_name },
    user: { id: s.user.id, name: s.user.name, avatarColor: s.user.avatar_color },
    feedback: s.feedback.map(fb => ({
      id: fb.id,
      text: fb.text,
      isAi: fb.is_ai,
      createdAt: fb.created_at,
      fromUser: fb.from_user
        ? { id: fb.from_user.id, name: fb.from_user.name, avatarColor: fb.from_user.avatar_color }
        : null,
    })),
  }));

  const pendingSubmissions = submissions.filter(s => s.feedback.length === 0);
  return <ReviewsClient pendingSubmissions={pendingSubmissions} allSubmissions={submissions} users={[]} />;
}
```

- [ ] **Step 4: tsc + tests + commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -3
cd ..
git add frontend/src/app/reviews/page.tsx
git commit -m "refactor(frontend): /reviews uses FastAPI (no Prisma)

apiServerFetch<BackendSubmission[]>(/api/v1/submissions); snake_case
→ camelCase adapter inside the page so ReviewsClient stays unchanged.
Computes pendingSubmissions client-side (feedback.length === 0).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 5: Port `/team/[id]` to FastAPI

**File:** `frontend/src/app/team/[id]/page.tsx`

Currently calls: `prisma.user.findUnique`, `prisma.submission.findMany`, `computePerformanceMetrics`, `getTasksForUser`, `getUpcomingLeavesForUser`.

- [ ] **Step 1: Replace each Prisma call**

```typescript
import { apiServerFetch } from "@/lib/api";
import { computePerformanceMetrics } from "@/lib/performance";
// ... existing imports

type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: "ceo" | "team_member";
  avatar_color: string;
  created_at: string;
};

type BackendTask = {
  id: string;
  title: string;
  status: string;
  due_date: string | null;
  project: { id: string; title: string } | null;
};

type BackendLeave = {
  id: string;
  type: string;
  start_date: string;
  end_date: string;
  status: string;
};

export default async function TeamMemberPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [user, submissions, tasks, leaves, perf] = await Promise.all([
    apiServerFetch<BackendUser>(`/api/v1/users/${id}`),
    apiServerFetch<BackendSubmission[]>(`/api/v1/users/${id}/submissions`),
    apiServerFetch<BackendTask[]>(`/api/v1/users/${id}/tasks`),
    apiServerFetch<BackendLeave[]>(`/api/v1/leaves?user_id=${id}&status=approved`),
    computePerformanceMetrics(id),
  ]);

  // ... pass to existing client component, adapt camelCase where needed
}
```

If `GET /api/v1/leaves?user_id=...` isn't supported by the backend yet, add the filter param in Task 2.

- [ ] **Step 2: tsc + tests + commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -3
cd ..
git add frontend/src/app/team/\[id\]/page.tsx
git commit -m "refactor(frontend): /team/[id] uses FastAPI (no Prisma)

apiServerFetch in parallel for: user, submissions, tasks, leaves,
performance metrics. Adapter from snake_case to camelCase
inline. computePerformanceMetrics now imported from src/lib/performance.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 6: Port the CEO Command Center

**File:** `frontend/src/components/landing/ceo-command-center.tsx`

This is the biggest one — 198 lines, 4 direct Prisma calls + 3 helper imports.

Direct Prisma calls to replace:
- `prisma.project.findMany(...)` → `apiServerFetch<BackendProject[]>("/api/v1/projects")`
- `prisma.task.findMany(...)` → `apiServerFetch<BackendTask[]>("/api/v1/tasks?status=todo,in_progress")` or similar
- `prisma.user.count({ where: { roleType: "team_member" } })` → `apiServerFetch<BackendUser[]>("/api/v1/users").then(users => users.filter(u => u.role_type === "team_member").length)` (or add a count endpoint if the list is huge)
- `prisma.project.count({ where: { status: "completed" } })` → fetch projects (already done above), filter + count

Helper imports to replace:
- `getActionInbox` → use `apiServerFetch<InboxResponse>("/api/v1/inbox")` (already returns `{ pending_leaves, pending_extensions }`)
- `getActiveLeaves` → fetch `/api/v1/leaves?status=approved&active=true` (or filter client-side from a leaves list)
- `getOverdueTasks` → fetch `/api/v1/tasks?overdue=1` (or filter client-side: tasks with `due_date < now` and `status != completed`)
- `ReviewInboxItem` / `CaptureInboxItem` / `ExtensionInboxItem` type imports → move to `src/lib/inbox-types.ts`

- [ ] **Step 1: Create `src/lib/inbox-types.ts`** (see shared types section)

- [ ] **Step 2: Confirm `/api/v1/inbox` shape**

```bash
curl -s http://localhost:8000/api/v1/inbox -H "Authorization: Bearer $ACCESS" | python -m json.tool
```

Compare to what `getActionInbox()` returned. If the FastAPI version doesn't include the "review submissions awaiting feedback" bucket that the Prisma helper produced, either:
- Extend the backend `/inbox` aggregator (preferred — keeps the frontend simple), OR
- Compose multiple fetches client-side here.

Pick based on what's already there. Document the choice in the commit.

- [ ] **Step 3: Rewrite the Server Component**

Replace every Prisma call + helper import with `apiServerFetch` calls in parallel via `Promise.all`. The existing client/JSX downstream should not need changes if we adapt the data shape to match what it consumes.

If the backend response shape and the client's expected shape differ (snake_case vs camelCase, flat vs nested), do the adapter inline.

- [ ] **Step 4: tsc + tests + commit**

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -3
cd ..
git add frontend/src/components/landing/ceo-command-center.tsx frontend/src/lib/inbox-types.ts
git commit -m "refactor(frontend): CEO Command Center uses FastAPI (no Prisma)

- Replaces 4 direct prisma.* calls with apiServerFetch
- Drops getActionInbox / getActiveLeaves / getOverdueTasks Prisma helpers
  in favor of /api/v1/inbox + /api/v1/leaves + /api/v1/tasks
- Moves inbox-related type defs to src/lib/inbox-types.ts

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

After this commit the frontend should have ZERO live `prisma.*` callers outside the still-undeleted helper modules.

Verify:
```bash
grep -rln "prisma\.\|@/lib/prisma" frontend/src/ \
  | grep -v "node_modules\|\.next\|generated/prisma\|__tests__\|lib/queries\|lib/prisma.ts"
```

Expected: no output.

---

### Task 7: Delete the Prisma surface

**Files to delete (in this order to avoid partial-state tsc errors):**

- [ ] **Step 1: Delete query helpers + their tests**

```bash
git rm -r frontend/src/lib/queries/
```

Tests inside `__tests__` go with them (6 .test.ts files).

- [ ] **Step 2: Delete Prisma client + test-db helper**

```bash
git rm frontend/src/lib/prisma.ts
git rm frontend/src/lib/__tests__/_helpers/test-db.ts
git rm frontend/src/lib/__tests__/_helpers/test-db.test.ts
```

- [ ] **Step 3: Delete generated client + prisma directory + dev.db**

```bash
git rm -r frontend/src/generated/prisma/
git rm -r frontend/prisma/
git rm frontend/dev.db
```

The `frontend/prisma/test-*.db` files were ignored by git but if any are tracked, the `git rm -r frontend/prisma/` handles them.

- [ ] **Step 4: tsc check + test**

```bash
cd frontend && npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -5
```

Expected: tsc clean. Tests pass at ~115–125 (139 − 14 from the 6 deleted test files; actual count depends on test count per file).

If tsc surfaces anything we missed (e.g. a hidden Prisma caller in a component), fix inline before commit.

- [ ] **Step 5: Commit**

```bash
cd ..
git commit -m "chore(frontend): delete Prisma + dev.db + queries + generated client

Removes the entire Prisma surface from frontend/:
- src/lib/prisma.ts, src/lib/queries/* (7 files), test helpers
- src/generated/prisma/ (generated client, ~30 files)
- prisma/ directory (schema, seed scripts, migrations, test DBs)
- dev.db (SQLite dev DB)
- 6 query-helper test files

All previously-Prisma-backed Server Components now use apiServerFetch.
The frontend is a pure FastAPI consumer.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 8: Remove Prisma from package.json + .gitignore tidy

**Files:**
- Modify: `frontend/package.json`
- Modify: `frontend/.gitignore` (only if dev.db / prisma artifacts weren't already there)

- [ ] **Step 1: Remove Prisma deps + the seed script**

```bash
cd frontend
npm uninstall prisma @prisma/client @prisma/adapter-better-sqlite3 @prisma/adapter-libsql
```

This both updates `package.json` and removes the packages from `node_modules`.

Then in `package.json` remove the `scripts.seed` entry (it pointed at `prisma/seed.mts` which no longer exists):

```diff
-    "seed": "npx tsx prisma/seed.mts",
```

- [ ] **Step 2: Verify .gitignore**

Ensure these lines are present in `frontend/.gitignore`:

```
# Old Prisma SQLite artifacts (kept just in case any get re-created)
*.db
*.db-journal
```

If already present, no edit needed.

- [ ] **Step 3: Run install + tests + build**

```bash
npm install 2>&1 | tail -3
npm test 2>&1 | tail -5
npm run build 2>&1 | tail -10
```

Expected:
- `npm install` resolves cleanly (no Prisma deps in lockfile)
- Tests pass
- Build succeeds with no missing-module errors

- [ ] **Step 4: Commit**

```bash
cd ..
git add frontend/package.json frontend/package-lock.json frontend/.gitignore
git commit -m "chore(frontend): remove Prisma deps + seed script

- npm uninstall prisma @prisma/client @prisma/adapter-better-sqlite3
  @prisma/adapter-libsql
- Drop the \"seed\" script (prisma/seed.mts no longer exists)
- Verify .gitignore covers *.db artifacts

The frontend package no longer declares any Prisma or SQLite
dependency. The backend (postgres + psycopg) is the only DB layer.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

### Task 9: Docs + final sanity

**Files:**
- Modify: `docs/migration-mapping.md`
- Modify: `README.md` (top-level + frontend/README.md) — remove any mention of Prisma/SQLite + the dev seed steps for Prisma
- Modify: `docs/dev-seed-credentials.md` — remove the "Prisma seed" section if any (the backend `python -m scripts.seed` is the only seed now)

- [ ] **Step 1: Update migration-mapping**

At the bottom of `docs/migration-mapping.md`, append a "Phase 7 cleanup" section that confirms Prisma is gone:

```markdown
## Phase 7 cleanup (2026-05-11)

Prisma + SQLite removed from `frontend/`. The frontend is now a
pure FastAPI consumer:
- All Server Components use `apiServerFetch<T>("/api/v1/...")`
- All client components use `fetch("/api/proxy/v1/...")`
- `frontend/prisma/`, `frontend/src/lib/prisma.ts`,
  `frontend/src/lib/queries/`, `frontend/src/generated/prisma/`,
  `frontend/dev.db` — all deleted
- `package.json` no longer lists `prisma`, `@prisma/client`,
  or any Prisma adapter
```

- [ ] **Step 2: Update READMEs**

`grep` both READMEs for "Prisma", "dev.db", "SQLite", "prisma generate", "prisma migrate". Replace each mention with the FastAPI equivalent (or just delete the line if it's no longer relevant).

```bash
grep -in "prisma\|dev\.db\|sqlite" README.md frontend/README.md
```

- [ ] **Step 3: Full final smoke**

```bash
cd backend && source .venv/Scripts/activate && pytest 2>&1 | tail -3
cd ../frontend && npm test 2>&1 | tail -3
npx tsc --noEmit 2>&1 | tail -5
npm run build 2>&1 | tail -10
cd ..
```

All four must be clean.

- [ ] **Step 4: Re-seed backend DB + browser smoke**

```bash
cd backend && source .venv/Scripts/activate && python -m scripts.seed
# Terminal 1: uvicorn app.main:app --reload --port 8000
# Terminal 2: cd frontend && npm run dev
```

Manual smoke (~5 min):
1. Login as CEO (`ceo@projecthub.dev` / `projecthub-dev`) → Command Center loads, no errors in uvicorn or browser console
2. `/reviews` → submissions list loads, pending count correct, AI Review button works
3. `/team` → roster loads with performance metrics
4. `/team/{some_user_id}` → user detail loads with submissions + tasks + leaves
5. `/projects/{id}` → detail still works (regression check)
6. `/capture` → can process notes (regression check)
7. `/my-tasks`, `/my-submissions` as a team member → still load

- [ ] **Step 5: Commit + push**

```bash
git add docs/migration-mapping.md README.md frontend/README.md docs/dev-seed-credentials.md
git commit -m "docs: mark Phase 7 (Prisma removal) complete

The frontend is a pure FastAPI consumer. All references to
Prisma, dev.db, and SQLite removed from docs.

End-of-Phase-7 state:
- Backend: 165 tests (162 + 3 from user-scoped endpoints)
- Frontend: ~120 tests (down from 139 — 6 Prisma-suite files deleted)
- Zero Prisma callers in frontend/src/
- frontend/prisma/, generated/prisma/, dev.db all gone
- package.json has no Prisma deps

Phase 8 (production deployment) is the only remaining phase.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

git push -u origin feature/backend-phase-7-prisma-removal
```

---

## Acceptance criteria

When all tasks complete:

1. Branch `feature/backend-phase-7-prisma-removal` exists with ~8–9 commits, pushed.
2. `cd backend && pytest -v` → ~165 tests pass (162 + 3 new user-scoped endpoint tests).
3. `cd frontend && npm test` → ~120 tests pass (139 − ~19 from 6 deleted Prisma-suite files).
4. `cd frontend && npx tsc --noEmit` → zero errors.
5. `cd frontend && npm run build` → succeeds.
6. `grep -rln "@/lib/prisma\|@/lib/queries\|@prisma\|prisma\." frontend/src/ | grep -v node_modules | grep -v generated/prisma` → no output.
7. `frontend/prisma/` directory does not exist.
8. `frontend/dev.db` does not exist.
9. `frontend/src/generated/prisma/` does not exist.
10. `frontend/package.json` does not list `prisma`, `@prisma/client`, `@prisma/adapter-better-sqlite3`, or `@prisma/adapter-libsql`.
11. Manual smoke: CEO Command Center, /reviews, /team, /team/[id], /projects/[id], /capture, /my-tasks, /my-submissions all load without errors.

## Out of scope (deferred to Phase 8)

- Production deployment (uvicorn + Gunicorn + reverse proxy + TLS).
- CI/CD pipeline (GitHub Actions running pytest + npm test on PR).
- Postgres connection pooling tuned for production load.
- Capture-item → task conversion endpoint (defer to a later UX phase).
- In-app notification inbox for team members (defer).
- Real `dev.db` removal in git history (`git filter-branch` or BFG) — keep this in v1 dev history; the file is gone from `HEAD` which is all we need.

## Risk notes for the implementer

- **Backend DB wiping during pytest.** The `db_clean` fixture truncates user-data tables. After any backend test run, re-seed (`python -m scripts.seed`) before manual browser testing or the frontend smoke will hit empty pages and 401s.
- **`/api/v1/inbox` is CEO-only** (mounted with `require_roles("ceo")`). The CEO Command Center is the only caller, so this is fine — but if a future task wants a team-member inbox, the endpoint will need scoping changes.
- **Adapter discipline.** Backend returns snake_case; client components were written against Prisma's camelCase. Always do the rename inside the Server Component before passing props to the client, so the client tree stays unchanged.
- **`computePerformanceMetrics` correctness.** The old Prisma version may have counted things slightly differently (e.g., excluding archived projects). Match the new implementation against the old one row-by-row before declaring Task 3 done.
- **Don't touch backend Prisma references in tests.** Backend has no Prisma. Only `frontend/` is affected. Don't run `pytest` against the *frontend* directory.
