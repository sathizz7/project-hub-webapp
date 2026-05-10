# Dev Seed Credentials

> ⚠️ **Dev only.** These users exist in the local seed only. **Do not** ship this password (or anything resembling it) to production. Production users will set their own passwords via a future password-reset flow.

The 5 seed users below are created by `backend/scripts/seed.py` and re-created any time the dev DB is wiped. They all share the same dev password so they're easy to remember during local testing.

## Shared password

```
projecthub-dev
```

(Set in `backend/scripts/seed.py` as `_DEV_PASSWORD`. Hashed once at seed-script import time via `bcrypt.hashpw(..., gensalt(rounds=12))`. The hash that lands in the DB is unique per seed run because of bcrypt's per-call salt.)

## Users

| Email | Role | Job title | Display name | Avatar color |
|---|---|---|---|---|
| `ceo@projecthub.dev` | **`ceo`** | Chief Executive Officer | Sundar Iyer | `#4F46E5` (indigo) |
| `arjun@projecthub.dev` | `team_member` | Senior Engineer | Arjun Mehta | `#14B8A6` (teal) |
| `priya@projecthub.dev` | `team_member` | Product Designer | Priya Sharma | `#F472B6` (pink) |
| `vikram@projecthub.dev` | `team_member` | Data Scientist | Vikram Rao | `#A855F7` (purple) |
| `lakshmi@projecthub.dev` | `team_member` | Engineering Manager | Lakshmi Nair | `#F59E0B` (amber) |

The **`role_type`** column drives access checks (CEO-only routes use `Depends(require_roles("ceo"))`). The **`role`** column is the free-text job title that appears in the UI.

## Recommended login for testing

```
Email:     ceo@projecthub.dev
Password:  projecthub-dev
```

The CEO has full access to all routes — including any CEO-only endpoints that come online in Phases 3 onward.

## How to test the auth flow in a browser

Two terminals required.

**Backend** (FastAPI on `:8000`):

```bash
cd backend
source .venv/Scripts/activate          # Windows Git Bash
# macOS/Linux: source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Frontend** (Next.js on `:3000`):

```bash
cd frontend
npm run dev
```

**In your browser:**

1. Visit `http://localhost:3000/projects` → middleware redirects you to `http://localhost:3000/login?from=%2Fprojects`.
2. Enter the CEO credentials above, click **Sign in**.
3. You should land back on `/projects` (or wherever `?from=` pointed).
4. Open DevTools → **Application → Cookies** for `localhost:3000`. You should see two HTTP-only cookies:
   - `ph_session` — Path `/`, value is a 30-day access JWT
   - `ph_refresh` — Path `/api/auth/refresh`, value is a 90-day refresh JWT
5. Click the user avatar (top-right of the topbar) → **Sign out** → both cookies clear and you're redirected to `/login`.

## How to test the auth API directly with curl

```bash
# Login — captures both tokens
LOGIN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "ceo@projecthub.dev", "password": "projecthub-dev"}')
ACCESS=$(echo "$LOGIN" | python -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
REFRESH=$(echo "$LOGIN" | python -c "import sys, json; print(json.load(sys.stdin)['data']['refresh_token'])")

# Get the current user
curl -s http://localhost:8000/api/v1/auth/me -H "Authorization: Bearer $ACCESS" | python -m json.tool

# Refresh the access token
curl -s -X POST http://localhost:8000/api/v1/auth/refresh \
    -H "Content-Type: application/json" \
    -d "{\"refresh_token\": \"$REFRESH\"}" | python -m json.tool

# Logout (no-op on backend; cookie clearing happens on the frontend)
curl -s -X POST http://localhost:8000/api/v1/auth/logout | python -m json.tool

# Verify wrong password is rejected
curl -s -w "\nHTTP %{http_code}\n" -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "ceo@projecthub.dev", "password": "wrong"}'
```

Every successful response follows the `{status, message, data}` envelope. Errors return `{"status": "failure", "message": "...", "data": null}` with the appropriate HTTP status.

## Re-seeding the DB

The seed is idempotent (`INSERT ... ON CONFLICT (email) DO NOTHING`), so running it doesn't update existing rows. To wipe + recreate (e.g. after schema changes):

```bash
cd backend
source .venv/Scripts/activate

# Truncate users (cascades to project_assignees, capture_sessions, etc.)
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute('TRUNCATE users RESTART IDENTITY CASCADE')
print('users truncated')
"

# Re-seed
python -m scripts.seed
```

Output: `users truncated`, then `Seed complete.` All 5 users back in the DB with fresh bcrypt hashes for the dev password.

## See also

- [`migration-mapping.md`](migration-mapping.md) — auth route migration status (Phase 2 = ✅)
- [`superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md`](superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md) — Section 4 (auth design)
- [`superpowers/plans/2026-05-10-backend-phase-2-auth-cutover.md`](superpowers/plans/2026-05-10-backend-phase-2-auth-cutover.md) — Phase 2 implementation plan
