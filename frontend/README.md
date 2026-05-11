# ProjectHub Frontend (Next.js)

This is the Next.js frontend for ProjectHub. After Phase 2 of the backend migration, this app talks to the FastAPI backend over HTTP — no direct database access.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

The frontend expects the FastAPI backend at `http://localhost:8000` (configurable via `NEXT_PUBLIC_API_URL` in `.env.local`). All data access goes through FastAPI — the frontend has no database layer.

## Tests

```bash
npm test           # one-shot vitest run
npm run test:watch # watch mode
```

## Build

```bash
npm run build
```

## Stack

- Next.js 16 (App Router)
- Tailwind 4
- shadcn/ui + Base UI
- FastAPI backend (Postgres + psycopg) via `apiServerFetch` in Server Components and `/api/proxy/v1/*` in client components

## See also

- Monorepo overview: [`../README.md`](../README.md)
- Backend: [`../backend/README.md`](../backend/README.md) (created in Phase 1)
- Migration spec: [`../docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md`](../docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md)
- Migration tracker: [`../docs/migration-mapping.md`](../docs/migration-mapping.md)
