# Backend Migration Mapping

Living tracker of every Next.js API route's migration to FastAPI. Updated as each route is cut over.

**Status legend:**
- ⏳ pending — route still served by Next.js / Prisma
- 🚧 in-progress — FastAPI endpoint exists; frontend not yet swapped
- ✅ done — frontend calls FastAPI; old Next.js route deleted

## Route status

| Old route (Next.js) | New route (FastAPI) | Status | Phase | Notes |
|---|---|---|---|---|
| `POST /api/auth/[...nextauth]` (login) | `POST /api/v1/auth/login` | ✅ | 2 | bcrypt + JWT issuance |
| (no equivalent today) | `POST /api/v1/auth/refresh` | ✅ | 2 | new — refresh access token |
| (no equivalent today) | `POST /api/v1/auth/logout` | ✅ | 2 | clears cookies |
| (NextAuth session helper) | `GET /api/v1/auth/me` | ✅ | 2 | replaces `getSessionUser()` Prisma path |
| `GET /api/users` | `GET /api/v1/users` | ⏳ | 3 | |
| (no equivalent today) | `GET /api/v1/users/{id}` | ⏳ | 3 | new |
| (no equivalent today) | `POST /api/v1/users` | ⏳ | 3 | ceo only |
| (no equivalent today) | `PATCH /api/v1/users/{id}` | ⏳ | 3 | ceo only |
| `GET /api/projects` | `GET /api/v1/projects` | ⏳ | 3 | hydrated: assignees + progress |
| `POST /api/projects` | `POST /api/v1/projects` | ⏳ | 3 | ceo only; auto-creates phases |
| `GET /api/projects/[id]` | `GET /api/v1/projects/{id}` | ⏳ | 3 | hydrated: phases + assignees + submissions + tasks + checkpoints |
| `PATCH /api/projects/[id]` | `PATCH /api/v1/projects/{id}` | ⏳ | 3 | |
| (no equivalent today) | `POST /api/v1/projects/{id}/assignees` | ⏳ | 3 | new |
| (no equivalent today) | `DELETE /api/v1/projects/{id}/assignees/{user_id}` | ⏳ | 3 | new |
| (no equivalent today) | `GET /api/v1/my/projects` | ⏳ | 3 | team-member-scoped |
| `PATCH /api/phases` | `PATCH /api/v1/phases/{id}` | ⏳ | 3 | resource id moves to path |
| (no equivalent today) | `GET /api/v1/projects/{id}/phases` | ⏳ | 3 | new |
| `PATCH /api/tasks/[id]` | `PATCH /api/v1/tasks/{id}` | ⏳ | 4 | |
| (no equivalent today) | `GET /api/v1/tasks` | ⏳ | 4 | new — list with filters |
| (no equivalent today) | `GET /api/v1/tasks/{id}` | ⏳ | 4 | new |
| (no equivalent today) | `POST /api/v1/tasks` | ⏳ | 4 | new |
| (no equivalent today) | `GET /api/v1/my/tasks` | ⏳ | 4 | team-member-scoped |
| `GET /api/submissions` | `GET /api/v1/submissions` | ⏳ | 4 | |
| `POST /api/submissions` | `POST /api/v1/submissions` | ⏳ | 4 | |
| (no equivalent today) | `GET /api/v1/submissions/{id}` | ⏳ | 4 | new |
| `POST /api/feedback` | `POST /api/v1/submissions/{id}/feedback` | ⏳ | 4 | nested under submission |
| (no equivalent today) | `GET /api/v1/submissions/{id}/feedback` | ⏳ | 4 | new |
| `POST /api/checkpoints` | `POST /api/v1/projects/{id}/checkpoints` | ⏳ | 4 | nested |
| (no equivalent today) | `GET /api/v1/projects/{id}/checkpoints` | ⏳ | 4 | new |
| `PATCH /api/leave-requests/[id]` | `PATCH /api/v1/leaves/{id}` | ⏳ | 5 | ceo approve/reject |
| (no equivalent today) | `GET /api/v1/leaves` | ⏳ | 5 | new |
| (no equivalent today) | `POST /api/v1/leaves` | ⏳ | 5 | new |
| `PATCH /api/deadline-extensions/[id]` | `PATCH /api/v1/deadline-extensions/{id}` | ⏳ | 5 | |
| (no equivalent today) | `GET /api/v1/deadline-extensions` | ⏳ | 5 | new |
| (no equivalent today) | `POST /api/v1/deadline-extensions` | ⏳ | 5 | new |
| (server-side helper today) | `GET /api/v1/inbox` | ⏳ | 5 | aggregator: pending leaves + extensions |
| `POST /api/capture/process` | `POST /api/v1/capture/process` | ⏳ | 6 | LLM parse + DB write |
| (no equivalent today) | `GET /api/v1/capture/sessions` | ⏳ | 6 | new |
| (no equivalent today) | `GET /api/v1/capture/sessions/{id}` | ⏳ | 6 | new |
| (no equivalent today) | `PATCH /api/v1/capture/items/{id}` | ⏳ | 6 | new |
| `POST /api/ai/generate-plan` | `POST /api/v1/ai/generate-plan` | ⏳ | 6 | LiteLLM + Gemini |
| `POST /api/ai/review` | `POST /api/v1/ai/review` | ⏳ | 6 | |
| `POST /api/ai/suggest-stack` | `POST /api/v1/ai/suggest-stack` | ⏳ | 6 | |
| (no equivalent today) | `GET /healthz` | ⏳ | 1 | new — backend liveness probe; optional `?deep=1` for DB ping |

## How to update

When you cut over a route in a later phase:
1. Flip its status emoji (⏳ → 🚧 → ✅)
2. Add a `Done in` column entry once frontend is wired and the old route is deleted
3. Commit the doc update alongside the migration commit
