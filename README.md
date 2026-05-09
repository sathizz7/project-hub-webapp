# ProjectHub

CEO-centric project management tool with role-based access (CEO + team members), AI-powered capture and reviews, and a project lifecycle modeled around phases + checkpoints.

## Repository layout

This is a monorepo:

| Directory | Purpose |
|---|---|
| [`frontend/`](frontend/) | Next.js 16 frontend — UI + minimal auth proxy routes |
| [`backend/`](backend/) | FastAPI + Postgres backend (in development; see migration spec) |
| [`docs/`](docs/) | Specs, plans, skills, migration tracker |

## Quickstart

### Frontend

```bash
cd frontend
npm install
npm run dev      # http://localhost:3000
```

See [`frontend/README.md`](frontend/README.md) for details.

### Backend

The backend skeleton is being built out across Phases 1–8 of the migration. Once Phase 1 ships, the quickstart will be:

```bash
cd backend
docker compose up -d postgres
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

See [`backend/README.md`](backend/README.md) (created in Phase 1) for details.

## Architecture

The current state is a Next.js full-stack app (Next.js + Prisma + SQLite + NextAuth). It is migrating to a FastAPI + Postgres backend with the Next.js app becoming a pure frontend — see:

- **Spec:** [`docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md`](docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md)
- **Migration tracker:** [`docs/migration-mapping.md`](docs/migration-mapping.md)
- **FastAPI conventions:** [`docs/fastapi-backend-stack.md`](docs/fastapi-backend-stack.md)
