# ProjectHub Frontend (Next.js)

This is the Next.js frontend for ProjectHub. After Phase 2 of the backend migration, this app talks to the FastAPI backend over HTTP — no direct database access.

## Local development

```bash
npm install
npm run dev      # http://localhost:3000
```

The frontend expects the FastAPI backend at `http://localhost:8000` once Phase 1 is complete (configurable via `NEXT_PUBLIC_API_URL` in `.env.local`). Until Phase 2 cutover, the existing Prisma + SQLite path keeps working.

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
- (transitional) Prisma 7 + SQLite — being removed in Phase 7
- (transitional) NextAuth — being removed in Phase 2

## See also

- Monorepo overview: [`../README.md`](../README.md)
- Backend: [`../backend/README.md`](../backend/README.md) (created in Phase 1)
- Migration spec: [`../docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md`](../docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md)
- Migration tracker: [`../docs/migration-mapping.md`](../docs/migration-mapping.md)
