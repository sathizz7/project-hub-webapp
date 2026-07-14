# Architecture Roadmap — New Product Backend

The reused ProjectHub backend is solid and production-shaped, but it was built for one specific product. This roadmap lists the **"improved architecture" work** to tackle as the new product's requirements are captured. Nothing here is done yet — it is the deferred backlog that follows the foundation setup on `backend-dev`.

> **Prerequisite:** most of these need the new client's domain, roles, and feature list defined first. Run a requirements/brainstorm pass before starting, then turn each item below into concrete tasks.

## 1. Introduce a service / repository layer

**Problem today:** each router interleaves raw SQL, business logic, and response-shaping in the endpoint body (e.g. `backend/app/routers/projects.py` mixes `_list_*` query helpers with manual dict assembly).

**Direction:** split into thin routers → services (business rules) → repositories (SQL). Keeps endpoints declarative and makes logic unit-testable without HTTP.

## 2. Enforce Pydantic response models on output

**Problem today:** routers hand-build response dicts; the response Pydantic models in `backend/app/schemas/*` and `backend/app/shapes.py` describe shapes but aren't enforced on the way out, so drift is possible.

**Direction:** serialize responses through the Pydantic models (FastAPI `response_model=` or explicit `.model_dump()`), so the schema is the single source of truth for the API surface.

## 3. Generalize the role / permission model

**Problem today:** the two-role model (`role_type IN ('ceo','team_member')`) is hard-coded into `require_roles("ceo")` call sites and the "404-not-403" scoped-read convention (`backend/app/auth.py` + every domain router).

**Direction:** move to a configurable role/permission model (roles + permissions, or scopes) so the new client's org structure isn't limited to CEO + member. Keep the 404-not-403 leak-prevention pattern.

## 4. Generalize the project taxonomy

**Problem today:** `type IN ('engineering','research')` is a DB CHECK constraint, and phase templates for those two types are hard-coded in `backend/app/projects_templates.py` (mirroring the old frontend).

**Direction:** widen/remove the CHECK constraint and move phase templates (and the AI prompts in `backend/app/prompts/*`) out of code into data/config, so new project types and workflows are added without code changes.

## 5. Close operational gaps

- **`docker-compose.yml` for Postgres** — the docs reference `docker compose up -d postgres`, but no compose file exists in the repo. Add one so local Postgres is one command.
- **CI** — there is no `.github/` workflow. Add lint (ruff) + type-check (mypy) + `pytest` on push/PR (this was deferred from the original migration's Phase 8).
- **(Optional) promote `backend/` to repo root** — now that this is backend-only, `backend/*` could move to the repository root for a cleaner layout. Deferred to avoid history churn during foundation setup.

## Suggested sequencing

1. Capture new-product requirements (domain, roles, entities, features, the new frontend's needs).
2. Ops gaps (§5: compose + CI) — cheap, unblocks everyone.
3. Response-model enforcement (§2) — low-risk, locks the API contract.
4. Service/repository layer (§1) — do this before adding many features, so new code lands in the clean structure.
5. Generalize roles (§3) and taxonomy (§4) — driven by the concrete new-client model.
6. Build the new features and the new frontend against the stabilized contract.
