---
name: backend-stack-setup
description: Use when the user is setting up, bootstrapping, scaffolding, or extending the IAS Dashboard backend stack — e.g. "set up the backend", "set up the backend stack", "bootstrap the backend", "scaffold a backend module", "wire up a new resource end-to-end", "add a new backend feature/module/domain area", or any request that spans schema + multiple Lambdas + SAM template + Postman + docs. Walks through schema → endpoints → Lambdas → template.yaml → Postman → docs in the established IAS Dashboard pattern (Python 3.12 Lambda + SAM + RDS Postgres + JWT). For a single isolated endpoint, use the `new-api` skill instead.
---

# backend-stack-setup — Set up / extend the IAS backend stack the IAS way

## Overview

A "feature" in this repo = a domain area (entities, sites, tasks, issues, schedules…) with several related Lambdas under one `src/<group>/` folder. This skill enforces the conventions in `CLAUDE.md` so the new module feels native: same Lambda-per-endpoint layout, common layer imports, response envelope, JWT context, UUIDs, role names, atomic writes, migrations-as-files, Postman + docs updates.

**Rule of thumb:** one HTTP endpoint = one Lambda folder = one entry in `template.yaml` (Resources + DefinitionBody.paths). No controllers, no routers, no shared HTTP layer.

---

## When to use

- "Add a new module for X" / "build feature Y"
- "Let admins/officers do Z" where Z requires more than one endpoint
- New domain table(s) + CRUD-ish APIs
- Cross-cutting feature touching schema + multiple Lambdas + docs

**Don't use for:** a single endpoint addition (use `new-api`); pure bugfixes; doc-only changes.

---

## Workflow

### Step 1 — Clarify until 95% confident (CLAUDE.md mandate)

Ask **one consolidated** question covering anything ambiguous:

- **Domain noun** — what is the resource? (used as folder name `src/<group>/`)
- **Roles** — who can call each endpoint? (`super_admin`, `admin`, `field_officer`)
- **Endpoints** — list method + path + purpose for each
- **Schema** — new tables? new columns? FKs? Confirm before touching `schema.sql`
- **Ownership rules** — e.g. field_officer can only see their own X (mirror the `sites.assigned_officer_id` pattern)
- **Atomicity** — any multi-write operations that must be transactional?
- **Mobile vs admin** — does it appear under `/api/v1/my/...` (officer) or top-level (admin)?

Do not write code until this is resolved.

### Step 2 — Schema first

- **Never edit `schema.sql` without explicit user confirmation.** State the proposed DDL, get approval.
- Once approved: update `schema.sql` AND create a migration file at `scripts/migration_<feature>.sql` that is idempotent (`IF NOT EXISTS`, `DO $$ ... $$` blocks for ALTERs).
- All PKs are **UUID** (`uuid` type, `gen_random_uuid()` default), not integers.
- Audit columns by convention: `created_by uuid`, `created_at timestamptz default now()`, `updated_at timestamptz`.
- For per-entity sequential numbers, follow the `sites.site_number` pattern (compute `MAX(seq)+1` inside the same transaction with `FOR UPDATE`).
- Reference formats follow the existing scheme (e.g. `26-GH-012-003`) — do not invent new ones unless asked.

### Step 3 — Plan the endpoints

Produce a table for the user to confirm before scaffolding:

| Method | Path | Lambda folder | Roles | Purpose |
|---|---|---|---|---|
| GET | `/api/v1/<group>` | `src/<group>/list_<group>/` | admin, super_admin | … |
| POST | `/api/v1/<group>` | `src/<group>/create_<resource>/` | admin | … |
| GET | `/api/v1/<group>/{id}` | `src/<group>/get_<resource>/` | … | … |
| PATCH | `/api/v1/<group>/{id}` | `src/<group>/update_<resource>/` | … | … |
| GET | `/api/v1/my/<group>` | `src/<group>/list_my_<group>/` | field_officer | mobile tab |

Naming rules:
- Folder names are `snake_case` verbs: `list_*`, `create_*`, `get_*`, `update_*`, `delete_*`, `submit_*`.
- Field-officer mobile endpoints live at `/api/v1/my/...` and filter by `user_id` from JWT.
- Admin endpoints scoped to a parent use nested paths: `/api/v1/entities/{id}/<group>`.

### Step 4 — Scaffold each Lambda (delegate to `new-api`)

For every row in the table, follow the `new-api` skill exactly. Repeat the rules briefly here so they are not skipped:

- Each Lambda has only `app.py` + `requirements.txt`.
- `requirements.txt` **must NOT contain `psycopg2-binary`** — it is provided by CommonLayer. Default contents:
  ```
  boto3>=1.28.0
  ```
  (Add `bcrypt`, `PyJWT` only when those specific packages are needed — login/authorizer/create_user are the only existing exceptions.)
- Imports come from the common layer:
  ```python
  from cors_utility import CorsUtility
  from db_util import get_db_connection, execute_query, validate_uuid
  ```
- Module-level connection reuse via `get_or_create_connection()` (warm-start pattern).
- Wrap every return with `CorsUtility.add_cors_headers(...)`.
- Response envelope: `{"status": "success"|"failure", "message": "...", "data": {...}}`.
- Parse JWT user context:
  ```python
  user_data = json.loads(event['requestContext']['authorizer']['user_data'])
  user_role = user_data['role']      # super_admin | admin | field_officer
  user_id   = user_data['user_id']
  ```
- Validate every UUID path param with `validate_uuid()` and return 400 on failure.
- Multi-write operations use a single transaction — `BEGIN` / commit / rollback in one connection. Mirror `tasks/submit_task` as the canonical example.
- Field-officer endpoints MUST enforce ownership via `WHERE assigned_officer_id = %s` (or equivalent), returning 404 — not 403 — when the resource isn't theirs (matches existing pattern).

### Step 5 — Wire `template.yaml`

For each Lambda add **two** blocks (per `new-api` skill):

1. `AWS::Serverless::Function` under `Resources` — `CodeUri: src/<group>/<fn>/`, `Layers: [!Ref CommonLayer]`, `Role: !GetAtt IASDashboardLambdaRole.Arn`, attached to `IASDashboardApi`.
2. Path entry under `DefinitionBody.paths` with `JwtAuthorizer` security and the standard `options` CORS mock.

Reuse path keys when multiple methods share a path. Maintain 2-space indentation. Do not touch unrelated resources.

### Step 6 — Update Postman + docs

Non-optional — these are how mobile/web teams consume the API:

- Add requests to the matching collection in `postman/`:
  - Mobile/officer endpoints → `06_Field_Officer_Mobile_FINAL.postman_collection.json`
  - Admin webapp endpoints → `07_Admin_Webapp_FINAL.postman_collection.json`
  - Otherwise the collection that matches the domain (`03_Admin_Setup_Management`, `04_Admin_Questionnaire_Builder`, `05_Admin_Dashboard_Monitoring`).
- Update `docs/MASTER_API_DOCUMENTATION.md` with method, path, request body, success response, role rules.
- If the feature has its own flow worth narrating, add `docs/<FEATURE>.md` (see `FIELD_OFFICER_ISSUES_AND_RESPONSES.md` as a template).
- Update `CLAUDE.md` "Recent Changes" with a numbered entry summarising the feature (one paragraph + bullet list of endpoints).

### Step 7 — Local build + deploy checklist

Tell the user, do not run unprompted:

```
# from repo root, native build (NOT --use-container)
sam build && sam deploy --config-env dev
```

Pre-deploy checks to call out:
- [ ] Migration script created and run on the dev DB **before** deploy if schema changed
- [ ] `grep -r "psycopg2" src/*/requirements.txt src/*/*/requirements.txt` returns nothing
- [ ] `.aws-sam/` deleted if a previous build failed (`rm -rf .aws-sam/`)
- [ ] Postman + docs updated and committed
- [ ] Stack: `ias-dashboard-v2-dev`, region `ap-south-1`

---

## Quick reference — must-match conventions

| Concern | Convention |
|---|---|
| Folder per endpoint | `src/<group>/<verb_resource>/app.py` |
| HTTP entrypoint | `lambda_handler(event, context)` |
| Connection reuse | module-level `db_connection` + `get_or_create_connection()` |
| psycopg2 source | CommonLayer **only** — never in function `requirements.txt` |
| Response shape | `{"status", "message", "data"}` wrapped with `CorsUtility.add_cors_headers` |
| Auth context | `json.loads(event['requestContext']['authorizer']['user_data'])` |
| Roles | `super_admin`, `admin`, `field_officer` (snake_case) |
| IDs | UUID strings, validated with `validate_uuid()` |
| Officer ownership | filter by `sites.assigned_officer_id`; 404 (not 403) on mismatch |
| Mobile path prefix | `/api/v1/my/...` |
| Atomic writes | single connection, single transaction (see `tasks/submit_task`) |
| SAM template | function under `Resources` + path under `DefinitionBody.paths` + `options` CORS mock |
| Schema | edit `schema.sql` only after explicit confirmation; pair with `scripts/migration_*.sql` |

---

## Common mistakes

- ❌ Adding `psycopg2-binary` to a function's `requirements.txt` → breaks build (see CLAUDE.md "Build & Deploy Troubleshooting").
- ❌ Returning bare dicts without `CorsUtility.add_cors_headers` → CORS preflight fails in browsers.
- ❌ Using integer IDs anywhere → schema is UUID end-to-end.
- ❌ Returning 403 instead of 404 when an officer requests another officer's resource → leaks existence; existing endpoints return 404.
- ❌ Multiple Lambdas per folder, or routing logic inside `app.py` → not the pattern; one folder = one endpoint.
- ❌ Editing `schema.sql` silently → always confirm + emit a migration file.
- ❌ Forgetting the `options` CORS mock in `DefinitionBody.paths` → mobile/web preflight fails.
- ❌ Skipping Postman/docs updates → mobile and admin teams can't pick up the change.
- ❌ Running `sam build --use-container` → CommonLayer is pre-built for Linux; container build re-pip-installs and breaks psycopg2.

---

## Anchor examples in the repo

When in doubt, mirror these:

- **CRUD module** → `src/schedules/` (create, list, get, update, delete, plus child collection)
- **Atomic multi-write** → `src/tasks/submit_task/app.py`
- **Officer-scoped read** → `src/sites/list_assigned_sites/app.py`, `src/issues/list_site_issues/app.py`
- **Per-entity sequential numbering** → `src/sites/create_site/app.py`
- **Versioned/cascading writes** → `src/questionnaire_versions/update_section/app.py`

Read the closest analogue **before** writing new code; copy the structure, not just the imports.
