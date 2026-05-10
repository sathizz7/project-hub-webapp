# Backend Phase 2 — Auth Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move the login flow from NextAuth (frontend, talks to Prisma) to FastAPI's `/api/v1/auth/*` routes (backend, talks to Postgres). The frontend stops hashing passwords and stops decoding JWTs — it just stores the FastAPI-issued token in an HTTP-only cookie and forwards it to FastAPI on every request via a Next.js proxy. Other pages (projects, tasks, etc.) **continue to use Prisma** in this phase — they migrate in Phases 3–6.

**Architecture:**
- **Backend** adds `app/auth.py` (JWT encode/decode, bcrypt verify, `get_current_user` and `require_roles` dependencies), `app/schemas/auth.py` (Pydantic models), `app/routers/auth.py` (`POST /login`, `GET /me`, `POST /refresh`, `POST /logout`). HS256 JWT with 1-month access tokens and 3-month refresh tokens.
- **Frontend** keeps **four** Next.js Route Handlers: `api/auth/login`, `api/auth/logout`, `api/auth/refresh` (all set/clear HTTP-only cookies after talking to FastAPI), and `api/proxy/[...path]` (forwards client-side fetches to FastAPI with the cookie injected as a Bearer header). Browser only ever talks to the Next.js origin — backend cookie crosses Next.js → FastAPI as Authorization header.
- **Server Components** read the cookie via `next/headers` and call FastAPI directly (server-to-server, no proxy needed).
- **Middleware** does presence-check only (no JWT decode); FastAPI is the truth source.
- NextAuth + `@auth/prisma-adapter` + `bcryptjs` are uninstalled from the frontend.

**Tech Stack:** FastAPI (existing), psycopg v3, **PyJWT** (new), **bcrypt** (new), **pydantic[email]** for `EmailStr` (new). Frontend: Next.js 16 App Router only — no new packages.

**Spec source:** `docs/superpowers/specs/2026-05-09-projecthub-fastapi-backend-design.md` — Section 4 (auth & frontend integration). Section 6 Phase 2.

**Branch:** `feature/backend-phase-2-auth` (cut from `master` at `a036d7e`)

---

## Decisions locked

| Topic | Decision | Why |
|---|---|---|
| JWT library | **`PyJWT`** (not `python-jose`) | smaller, more focused, fewer deps, well-maintained |
| Password hashing | **`bcrypt`** package directly (not `passlib`) | passlib is heavyweight; bcrypt's Python lib is ~50 LOC of API; matches Section 4 spec |
| `EmailStr` validation | install `pydantic[email]` extra | Pydantic v2 split this out; one-line dependency add |
| Token algorithm | **HS256** with shared secret | per spec; symmetric is fine for monolith; no key rotation in v1 |
| Token TTLs | access **30 days**, refresh **90 days** | per spec Section 4 (1mo / 3mo); intentionally generous for an internal-CEO tool |
| Refresh token rotation | **No rotation in v1** — refresh endpoint reissues only the access token | simpler; rotation can be added later if abuse appears |
| Logout endpoint | exists on FastAPI but is a no-op (returns `ok()`); cookie clearing is the frontend Route Handler's job | stateless JWT — there's no server-side session to invalidate. Backend endpoint preserves API symmetry + future audit logging hook. |
| Cookie names | `ph_session` (access, `Path=/`), `ph_refresh` (refresh, `Path=/api/auth/refresh`) | per spec Section 4 |
| Cookie flags | `HttpOnly`, `Secure` (only in prod via `NODE_ENV`), `SameSite=Lax` | XSS-resistant; `SameSite=Lax` allows cross-origin redirects (login flow) without breaking |
| Refresh token cookie scoping | `Path=/api/auth/refresh` | so the refresh cookie only goes to the one endpoint that uses it (least privilege) |
| Frontend auth tests | **No unit tests for the 4 Route Handlers** in this phase — relied on by an E2E smoke test (Task 11) | Vitest+Next.js Route Handler testing is non-trivial and adds complexity for limited value when the entire flow is exercised end-to-end |
| Login page UI | preserve existing JSX/styling — change only the form submit (NextAuth `signIn()` → `fetch('/api/auth/login')`) | minimum-diff principle; don't redesign while changing plumbing |
| `getSessionUser()` migration | rewrite to read cookie + `GET /api/v1/auth/me` instead of Prisma. Returns `null` on failure (same contract as today). | call sites in Server Components don't change |
| Server Component → FastAPI | direct `fetch` (no proxy) — Server Components read cookie via `next/headers` and forward as Bearer | proxy is for client-side calls only; SSR can talk directly |
| Migration-mapping update | flip auth rows to ✅ at end of phase | `POST /login`, `POST /refresh`, `POST /logout`, `GET /me` all live and frontend-consumed |

---

## File structure (after this plan)

```
backend/
├── app/
│   ├── main.py                  # MODIFIED — include auth router
│   ├── auth.py                  # NEW — JWT helpers, password hashing, get_current_user, require_roles
│   ├── schemas/
│   │   ├── __init__.py          # NEW
│   │   └── auth.py              # NEW — LoginRequest, RefreshRequest, LoginResponse, UserOut
│   └── routers/
│       └── auth.py              # NEW — POST /login, GET /me, POST /refresh, POST /logout
├── scripts/
│   └── seed.py                  # MODIFIED — real bcrypt hashes (was placeholder)
├── tests/
│   ├── test_auth.py             # NEW — JWT/bcrypt/get_current_user/require_roles unit tests
│   └── test_routers_auth.py     # NEW — POST /login, GET /me, POST /refresh, POST /logout integration tests
├── pyproject.toml               # MODIFIED — adds pyjwt, bcrypt, pydantic[email]

frontend/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   ├── login/route.ts       # NEW — POST → FastAPI /login + set cookies
│   │   │   │   ├── logout/route.ts      # NEW — POST → clear cookies (no FastAPI call)
│   │   │   │   ├── refresh/route.ts     # NEW — POST → FastAPI /refresh + reset session cookie
│   │   │   │   └── [...nextauth]/route.ts   # DELETED
│   │   │   └── proxy/
│   │   │       └── [...path]/route.ts   # NEW — proxy client fetches to FastAPI with Bearer header
│   │   └── login/page.tsx               # MODIFIED — submit to /api/auth/login (was NextAuth signIn())
│   ├── lib/
│   │   ├── auth.ts                      # DELETED (NextAuth config)
│   │   ├── api.ts                       # NEW — apiServerFetch helper for Server Components
│   │   └── session.ts                   # REWRITTEN — cookie + /auth/me (was Prisma + NextAuth)
│   ├── middleware.ts                    # REWRITTEN — cookie-presence check (was NextAuth handler)
│   └── types/
│       └── next-auth.d.ts               # DELETED
├── package.json                         # MODIFIED — uninstall next-auth, @auth/prisma-adapter, bcryptjs, @types/bcryptjs
├── .env.local                           # MODIFIED — add NEXT_PUBLIC_API_URL=http://localhost:8000

docs/
├── migration-mapping.md                 # MODIFIED — auth rows ⏳ → ✅
```

---

## Tasks

### Task 1: Cut branch + sanity check

**Files:** none (git ops only)

- [ ] **Step 1: Verify state**

```bash
cd D:/work-space/task/ProjectHub
git checkout master
git pull origin master
git log -1 --oneline
```

Expected HEAD: `a036d7e Merge pull request #1 from sathizz7/feature/backend-phase-1-bootstrap` (or later if Phase 2 has been started elsewhere).

- [ ] **Step 2: Confirm both apps work from master**

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected: 25 tests pass.

```bash
cd ../frontend
npm test 2>&1 | tail -10
```

Expected: 138 tests pass across 25 files. (If you see Prisma-related failures, the previous phase didn't actually land cleanly — investigate before proceeding.)

```bash
cd ..
```

- [ ] **Step 3: Cut new branch**

```bash
git checkout -b feature/backend-phase-2-auth
```

Expected: `Switched to a new branch 'feature/backend-phase-2-auth'`.

- [ ] **Step 4: Confirm local Postgres + FastAPI still boot**

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub') as conn:
    with conn.cursor() as cur:
        cur.execute('SELECT count(*) AS c FROM users')
        print('users:', cur.fetchone()['c'])
"
```

Expected: `users: 5` (the 5 seeded users from Phase 1). If the count is 0 or DB connection fails, run `python -m scripts.seed` to populate, then try again.

```bash
cd ..
```

---

### Task 2: Backend dependencies — add `pyjwt`, `bcrypt`, `pydantic[email]`

**Files:**
- Modify: `backend/pyproject.toml`

- [ ] **Step 1: Update dependencies in `backend/pyproject.toml`**

Open the file. Find the `dependencies` array and replace it with this exact block:

```toml
dependencies = [
    "fastapi>=0.115,<0.117",
    "uvicorn[standard]>=0.30,<0.34",
    "psycopg[pool,binary]>=3.2,<3.3",
    "pydantic[email]>=2.9,<3",
    "pydantic-settings>=2.5,<3",
    "alembic>=1.13,<2",
    "pyjwt>=2.9,<3",
    "bcrypt>=4.2,<5",
]
```

Three changes vs. Phase 1:
- `pydantic` → `pydantic[email]` (pulls in `email-validator` for `EmailStr`)
- New: `pyjwt>=2.9,<3` (JWT encode/decode)
- New: `bcrypt>=4.2,<5` (password hashing)

Leave the `[project.optional-dependencies]`, `[build-system]`, `[tool.*]` blocks unchanged.

- [ ] **Step 2: Reinstall the package + new deps**

```bash
cd backend
source .venv/Scripts/activate
pip install -e ".[dev,prod]"
```

Expected: pip resolves and installs `pyjwt`, `bcrypt`, `email-validator` (pulled in by `pydantic[email]`). No errors.

- [ ] **Step 3: Quick smoke check that imports work**

```bash
PYTHONIOENCODING=utf-8 python -c "
import jwt
import bcrypt
from pydantic import EmailStr
print('pyjwt:', jwt.__version__)
print('bcrypt:', bcrypt.__version__)
print('EmailStr import: OK')
"
```

Expected: version strings printed; no `ImportError`.

- [ ] **Step 4: Commit**

```bash
cd ..
git add backend/pyproject.toml
git commit -m "$(cat <<'EOF'
chore(backend): add pyjwt, bcrypt, pydantic[email] for Phase 2 auth

Three deps for the auth router (Task 5):
- pyjwt 2.x — HS256 token encode/decode (no extra C deps)
- bcrypt 4.x — password hashing/verification
- pydantic[email] — pulls email-validator for EmailStr in
  schemas/auth.py LoginRequest

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 3: `app/auth.py` — JWT + bcrypt helpers + dependencies (TDD)

**Files:**
- Create: `backend/app/auth.py`
- Create: `backend/tests/test_auth.py`

- [ ] **Step 1: Write failing test at `backend/tests/test_auth.py`**

```python
"""Tests for app.auth — JWT + bcrypt + get_current_user + require_roles."""

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import FastAPI, HTTPException
from fastapi.testclient import TestClient

from app.auth import (
    ACCESS_TOKEN_TTL,
    REFRESH_TOKEN_TTL,
    CurrentUser,
    decode_token,
    get_current_user,
    hash_password,
    issue_access_token,
    issue_refresh_token,
    require_roles,
    verify_password,
)
from app.config import settings


# ----- password hashing -----

def test_hash_password_returns_bcrypt_string() -> None:
    """hash_password produces a bcrypt-prefixed hash string."""
    h = hash_password("hunter2")
    assert h.startswith("$2b$") or h.startswith("$2a$")
    assert len(h) >= 60


def test_verify_password_roundtrip() -> None:
    """Verifying the same password against its hash succeeds."""
    h = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", h) is True


def test_verify_password_wrong() -> None:
    """Verifying a wrong password fails (returns False, no exception)."""
    h = hash_password("right")
    assert verify_password("wrong", h) is False


# ----- token issue + decode -----

def test_issue_and_decode_access_token() -> None:
    """Access token roundtrip carries user_id + role_type + an exp ~30 days out."""
    token = issue_access_token("user-123", "ceo")
    payload = decode_token(token)
    assert payload["user_id"] == "user-123"
    assert payload["role_type"] == "ceo"
    assert "exp" in payload
    assert "iat" in payload
    # exp should be ~30 days from now
    exp_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    delta = exp_dt - datetime.now(timezone.utc)
    assert timedelta(days=29) < delta < timedelta(days=31)


def test_issue_and_decode_refresh_token() -> None:
    """Refresh token has type='refresh' and exp ~90 days out."""
    token = issue_refresh_token("user-456")
    payload = decode_token(token)
    assert payload["user_id"] == "user-456"
    assert payload["type"] == "refresh"
    exp_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    delta = exp_dt - datetime.now(timezone.utc)
    assert timedelta(days=89) < delta < timedelta(days=91)


def test_decode_token_rejects_expired() -> None:
    """An expired token raises a PyJWT error on decode."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": "x",
        "role_type": "ceo",
        "iat": now - timedelta(days=2),
        "exp": now - timedelta(days=1),
    }
    expired = jwt.encode(payload, settings.jwt_secret, algorithm="HS256")
    with pytest.raises(jwt.ExpiredSignatureError):
        decode_token(expired)


def test_decode_token_rejects_bad_signature() -> None:
    """A token signed with the wrong secret raises InvalidSignatureError."""
    bad = jwt.encode({"user_id": "x", "role_type": "ceo"}, "wrong-secret-32-chars-long-xxxxxx", algorithm="HS256")
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(bad)


# ----- get_current_user dependency -----

def _build_app() -> FastAPI:
    app = FastAPI()

    @app.get("/who")
    def _who(user: CurrentUser = pytest.importorskip("fastapi").Depends(get_current_user)):  # noqa: B008
        return {"user_id": user.user_id, "role_type": user.role_type}

    @app.get("/ceo-only", dependencies=[pytest.importorskip("fastapi").Depends(require_roles("ceo"))])
    def _ceo_only():
        return {"ok": True}

    return app


def test_get_current_user_with_valid_token() -> None:
    client = TestClient(_build_app())
    token = issue_access_token("user-789", "team_member")
    response = client.get("/who", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json() == {"user_id": "user-789", "role_type": "team_member"}


def test_get_current_user_missing_header() -> None:
    client = TestClient(_build_app(), raise_server_exceptions=False)
    response = client.get("/who")
    assert response.status_code == 401


def test_get_current_user_rejects_refresh_token() -> None:
    """A refresh token must not authenticate as an access token."""
    client = TestClient(_build_app(), raise_server_exceptions=False)
    refresh = issue_refresh_token("user-789")
    response = client.get("/who", headers={"Authorization": f"Bearer {refresh}"})
    assert response.status_code == 401


def test_require_roles_allows_matching_role() -> None:
    client = TestClient(_build_app())
    token = issue_access_token("user-1", "ceo")
    response = client.get("/ceo-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200


def test_require_roles_rejects_mismatched_role() -> None:
    client = TestClient(_build_app(), raise_server_exceptions=False)
    token = issue_access_token("user-2", "team_member")
    response = client.get("/ceo-only", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_constants_match_spec() -> None:
    """Token TTLs match the spec: 30d access, 90d refresh."""
    assert ACCESS_TOKEN_TTL == timedelta(days=30)
    assert REFRESH_TOKEN_TTL == timedelta(days=90)
```

Yes, the test file is long — auth is the most security-sensitive surface in the project; it deserves thorough coverage.

- [ ] **Step 2: Run, verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_auth.py -v
```

Expected: `ModuleNotFoundError: No module named 'app.auth'`. Stop and report BLOCKED if you see anything else.

- [ ] **Step 3: Create `backend/app/auth.py`**

```python
"""Authentication primitives — JWT, bcrypt, FastAPI dependencies.

All token operations use HS256 with the shared secret in settings.jwt_secret.
Access tokens carry user_id + role_type + iat + exp. Refresh tokens carry
user_id + type='refresh' + iat + exp and must NOT authenticate API requests
(get_current_user enforces this).
"""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status

from app.config import settings


ACCESS_TOKEN_TTL = timedelta(days=30)
REFRESH_TOKEN_TTL = timedelta(days=90)
JWT_ALGORITHM = "HS256"


@dataclass(frozen=True)
class CurrentUser:
    """Authenticated user as resolved from a valid access token."""

    user_id: str
    role_type: str


# ----- password hashing -----

def hash_password(plain: str) -> str:
    """Hash a plaintext password with bcrypt (12 rounds)."""
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    """Constant-time check of a plaintext password against a stored hash.

    Returns False on mismatch (does not raise).
    """
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        # malformed hash or non-string → treat as mismatch
        return False


# ----- JWT issue + decode -----

def issue_access_token(user_id: str, role_type: str) -> str:
    """Issue a 30-day HS256 access token."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "role_type": role_type,
        "iat": now,
        "exp": now + ACCESS_TOKEN_TTL,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def issue_refresh_token(user_id: str) -> str:
    """Issue a 90-day HS256 refresh token (type='refresh')."""
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + REFRESH_TOKEN_TTL,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and verify a JWT. Raises jwt.PyJWTError subclasses on failure."""
    return jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])


# ----- FastAPI dependencies -----

def get_current_user(request: Request) -> CurrentUser:
    """Resolve the current user from the Authorization: Bearer <jwt> header.

    Raises 401 on:
    - missing or malformed header
    - invalid/expired token
    - refresh tokens (the refresh token is for /auth/refresh only)
    """
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    if payload.get("type") == "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cannot authenticate API requests",
        )
    return CurrentUser(user_id=payload["user_id"], role_type=payload["role_type"])


def require_roles(*allowed_roles: str) -> Callable[[CurrentUser], CurrentUser]:
    """Dependency factory that 403s when the current user's role isn't in allowed_roles.

    Usage:
        @router.post("/projects", dependencies=[Depends(require_roles("ceo"))])
        def create_project(...): ...
    """
    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role_type not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user

    return _checker
```

- [ ] **Step 4: Run, verify pass**

```bash
pytest tests/test_auth.py -v
```

Expected: **13 tests pass**.

If a test fails:
- `test_issue_and_decode_access_token` — check the `exp` is set to `now + ACCESS_TOKEN_TTL`. PyJWT serializes datetimes to seconds since epoch automatically.
- `test_get_current_user_with_valid_token` — the test uses `pytest.importorskip("fastapi").Depends(...)` (avoids a top-level import line; not pretty but works). If it errors on `Depends` not being resolvable, this is a Python 3.12 + pytest 8.3 quirk; in that case rewrite as a regular `from fastapi import Depends` at the top of the test file and use `Depends(get_current_user)` directly in the route signature.

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/app/auth.py backend/tests/test_auth.py
git commit -m "$(cat <<'EOF'
feat(backend): app.auth — JWT, bcrypt, FastAPI dependencies

- hash_password / verify_password — bcrypt 12-round; verify is
  constant-time and returns False on mismatch (no exception leak).
- issue_access_token (30d) / issue_refresh_token (90d) — HS256
  with shared secret from settings.jwt_secret. Access carries
  user_id + role_type; refresh carries user_id + type='refresh'.
- decode_token — raises jwt.PyJWTError subclasses on bad sig /
  expiry / malformed.
- get_current_user — FastAPI dependency that reads
  Authorization: Bearer, decodes, returns a frozen CurrentUser
  dataclass. 401 on missing/invalid token. Refresh tokens are
  explicitly rejected here so they can only be used by the
  /auth/refresh endpoint.
- require_roles(*allowed) — dependency factory; 403 on mismatch.

13 unit tests cover hashing, token roundtrips, expiry rejection,
bad-sig rejection, refresh-token rejection in get_current_user,
and the role guard.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 4: `app/schemas/auth.py` — Pydantic models

**Files:**
- Create: `backend/app/schemas/__init__.py` (empty package marker)
- Create: `backend/app/schemas/auth.py`

- [ ] **Step 1: Create the schemas package**

```bash
mkdir -p backend/app/schemas
touch backend/app/schemas/__init__.py
```

- [ ] **Step 2: Create `backend/app/schemas/auth.py`**

```python
"""Pydantic request/response models for auth endpoints."""

from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class RefreshRequest(BaseModel):
    refresh_token: str


class UserOut(BaseModel):
    """Public user shape (no password_hash) used in responses."""

    id: str
    name: str
    email: EmailStr
    role: str
    role_type: str
    avatar_color: str


class LoginResponse(BaseModel):
    """Login response payload (envelope's `data` field)."""

    access_token: str
    refresh_token: str
    user: UserOut


class RefreshResponse(BaseModel):
    """Refresh response payload (envelope's `data` field)."""

    access_token: str
```

No tests for this file — it's pure data contracts. Pydantic itself is well-tested; the integration tests in Task 5 exercise the schemas end-to-end via the routes.

- [ ] **Step 3: Confirm imports work**

```bash
cd backend
source .venv/Scripts/activate
PYTHONIOENCODING=utf-8 python -c "
from app.schemas.auth import LoginRequest, RefreshRequest, LoginResponse, UserOut, RefreshResponse
LoginRequest(email='a@b.com', password='x')
print('schemas OK')
"
```

Expected: `schemas OK`. If you get a `pydantic.ValidationError` complaining about `email_validator`, the `pydantic[email]` extra didn't install — re-run Task 2 Step 2.

- [ ] **Step 4: Commit**

```bash
cd ..
git add backend/app/schemas/__init__.py backend/app/schemas/auth.py
git commit -m "$(cat <<'EOF'
feat(backend): app.schemas.auth — Pydantic models for auth router

- LoginRequest(email: EmailStr, password: str)
- RefreshRequest(refresh_token: str)
- UserOut — public user shape (no password_hash)
- LoginResponse(access_token, refresh_token, user: UserOut)
- RefreshResponse(access_token: str)

EmailStr requires pydantic[email] (added in Task 2). No business
logic in models — they're shapes only, per the fastapi-backend-stack
convention.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 5: `app/routers/auth.py` — login/me/refresh/logout endpoints (TDD)

**Files:**
- Create: `backend/app/routers/auth.py`
- Create: `backend/tests/test_routers_auth.py`

This is the largest task in the plan. The four endpoints touch the DB, the auth helpers, and the response envelope.

- [ ] **Step 1: Write failing test at `backend/tests/test_routers_auth.py`**

```python
"""Integration tests for /api/v1/auth/* endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token, issue_refresh_token
from app.db import get_conn


# Tests need a known user with a known password. We seed one inside the test
# DB before each test class via the db_clean fixture from conftest.py.

_KNOWN_EMAIL = "auth-test-user@projecthub.dev"
_KNOWN_PASSWORD = "correct-horse-battery-staple"


@pytest.fixture
def known_user(db_clean: None) -> str:
    """Insert a single known-credentials user; return its UUID."""
    pw_hash = hash_password(_KNOWN_PASSWORD)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Auth Test User', %s, 'Tester', 'ceo', '#FF0000', %s)
                RETURNING id
                """,
                (_KNOWN_EMAIL, pw_hash),
            )
            row = cur.fetchone()
        conn.commit()
    return str(row["id"])


# ----- POST /login -----

def test_login_with_correct_credentials_returns_tokens(client: TestClient, known_user: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": _KNOWN_EMAIL, "password": _KNOWN_PASSWORD},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "success"
    data = body["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == _KNOWN_EMAIL
    assert data["user"]["role_type"] == "ceo"
    assert "password_hash" not in data["user"]


def test_login_with_wrong_password_returns_401(client: TestClient, known_user: str) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": _KNOWN_EMAIL, "password": "totally-wrong"},
    )
    assert response.status_code == 401
    assert response.json()["status"] == "failure"


def test_login_with_unknown_email_returns_401(client: TestClient, db_clean: None) -> None:
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@projecthub.dev", "password": "whatever"},
    )
    assert response.status_code == 401


def test_login_with_invalid_email_format_returns_422(client: TestClient, db_clean: None) -> None:
    """Pydantic EmailStr validation rejects malformed addresses."""
    response = client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "x"},
    )
    assert response.status_code == 422


# ----- GET /me -----

def test_me_with_valid_token_returns_user(client: TestClient, known_user: str) -> None:
    token = issue_access_token(known_user, "ceo")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["data"]["email"] == _KNOWN_EMAIL


def test_me_without_token_returns_401(client: TestClient) -> None:
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401


def test_me_with_refresh_token_returns_401(client: TestClient, known_user: str) -> None:
    """Refresh token must not authenticate /me."""
    token = issue_refresh_token(known_user)
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 401


def test_me_with_token_for_deleted_user_returns_404(client: TestClient, db_clean: None) -> None:
    """Token references a user that no longer exists in the DB → 404."""
    token = issue_access_token("00000000-0000-0000-0000-000000000000", "ceo")
    response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 404


# ----- POST /refresh -----

def test_refresh_with_valid_refresh_token_returns_new_access(
    client: TestClient, known_user: str
) -> None:
    refresh = issue_refresh_token(known_user)
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["status"] == "success"
    assert "access_token" in body["data"]


def test_refresh_with_access_token_returns_401(
    client: TestClient, known_user: str
) -> None:
    """Access tokens (no type='refresh') must not refresh."""
    access = issue_access_token(known_user, "ceo")
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": access},
    )
    assert response.status_code == 401


def test_refresh_with_invalid_token_returns_401(client: TestClient, db_clean: None) -> None:
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": "not-a-real-jwt"},
    )
    assert response.status_code == 401


def test_refresh_for_deleted_user_returns_401(client: TestClient, db_clean: None) -> None:
    """Refresh succeeds in decoding but user no longer exists → 401."""
    refresh = issue_refresh_token("00000000-0000-0000-0000-000000000000")
    response = client.post(
        "/api/v1/auth/refresh",
        json={"refresh_token": refresh},
    )
    assert response.status_code == 401


# ----- POST /logout -----

def test_logout_returns_success(client: TestClient) -> None:
    """Logout endpoint is stateless — always returns success."""
    response = client.post("/api/v1/auth/logout")
    assert response.status_code == 200
    assert response.json()["status"] == "success"
```

13 integration tests. They use the `client` fixture from `conftest.py` (which spins up the FastAPI app with lifespan) and the `db_clean` fixture (which truncates tables).

- [ ] **Step 2: Run, verify failure**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_routers_auth.py -v
```

Expected: tests collect but fail with `404 Not Found` on every endpoint (because the router isn't included in `app.main` yet).

If you see `ImportError` on `from app.auth import ...` — Task 3 didn't land. Stop and report.

- [ ] **Step 3: Create `backend/app/routers/auth.py`**

```python
"""Auth router — POST /login, GET /me, POST /refresh, POST /logout.

The frontend only ever talks to FastAPI through these four endpoints
plus the rest of /api/v1/* (added in later phases). All responses
follow the {status, message, data} envelope.
"""

import jwt
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    CurrentUser,
    decode_token,
    get_current_user,
    issue_access_token,
    issue_refresh_token,
    verify_password,
)
from app.db import get_conn
from app.responses import ok
from app.schemas.auth import LoginRequest, RefreshRequest


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    """Authenticate a user and issue an access + refresh token pair."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, role, role_type, avatar_color, password_hash
                FROM users WHERE email = %s
                """,
                (payload.email,),
            )
            user = cur.fetchone()

    # Same 401 for both unknown email and wrong password — don't leak which.
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = str(user["id"])
    return ok(
        data={
            "access_token": issue_access_token(user_id, user["role_type"]),
            "refresh_token": issue_refresh_token(user_id),
            "user": {
                "id": user_id,
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "role_type": user["role_type"],
                "avatar_color": user["avatar_color"],
            },
        }
    )


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    """Return the current user's public profile (sourced from DB, not the JWT)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, role, role_type, avatar_color
                FROM users WHERE id = %s
                """,
                (user.user_id,),
            )
            row = cur.fetchone()
    if row is None:
        # Token decoded fine but user has been deleted — distinct from 401.
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found",
        )
    return ok(
        data={
            "id": str(row["id"]),
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "role_type": row["role_type"],
            "avatar_color": row["avatar_color"],
        }
    )


@router.post("/refresh")
def refresh(payload: RefreshRequest) -> dict:
    """Exchange a refresh token for a new access token (no rotation in v1)."""
    try:
        decoded = decode_token(payload.refresh_token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not a refresh token",
        )
    user_id = decoded["user_id"]

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT role_type FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )

    return ok(data={"access_token": issue_access_token(user_id, row["role_type"])})


@router.post("/logout")
def logout() -> dict:
    """Stateless: token revocation isn't possible without a denylist.

    Cookie clearing is the frontend Route Handler's responsibility. This
    endpoint exists for API symmetry and as a hook for future audit logging.
    """
    return ok(message="Logged out")
```

- [ ] **Step 4: Wire the router into `backend/app/main.py`**

Open `backend/app/main.py`. Find the `from app.routers import health` line near the top and update it to also import auth. Add the `app.include_router(auth.router)` line below the existing `app.include_router(health.router)`.

After edit, the relevant block looks like:

```python
from app.routers import auth, health

# ... (rest of file unchanged through register_exception_handlers(app)) ...

app.include_router(health.router)
app.include_router(auth.router)
```

- [ ] **Step 5: Run, verify pass**

```bash
pytest tests/test_routers_auth.py -v
```

Expected: **13 tests pass**. If a test fails:
- 404s on `/api/v1/auth/*` — `app.include_router(auth.router)` is missing or the router prefix is wrong.
- `db_clean` not found — conftest.py from Phase 1 should still expose it. If pytest can't see it, run from the `backend/` directory not from the repo root.
- `test_login_with_invalid_email_format_returns_422` returns 200 instead — `pydantic[email]` extra didn't install. Re-run Task 2 Step 2.

- [ ] **Step 6: Run the full backend suite**

```bash
pytest -v
```

Expected: **51 tests pass** total (Phase 1's 25 + Phase 2's 13 auth + 13 router auth = 51).

- [ ] **Step 7: Commit**

```bash
cd ..
git add backend/app/routers/auth.py backend/app/main.py backend/tests/test_routers_auth.py
git commit -m "$(cat <<'EOF'
feat(backend): app.routers.auth — login/me/refresh/logout endpoints

- POST /api/v1/auth/login — bcrypt-verifies the password, issues
  a 30d access + 90d refresh token pair, returns the user profile.
  Returns the same 401 for both unknown email and wrong password
  (no enumeration leak).
- GET /api/v1/auth/me — sources the user profile from DB (not the
  JWT) so renames/role changes show up immediately. 404 if the
  user has been deleted (distinct from 401 = bad token).
- POST /api/v1/auth/refresh — verifies the refresh token, looks
  up the user, and issues a new access token only (no rotation
  in v1). 401 on bad/expired/access-typed token or deleted user.
- POST /api/v1/auth/logout — stateless no-op; cookie clearing
  happens on the frontend. Endpoint exists for API symmetry.

13 integration tests in test_routers_auth.py exercise all four
endpoints, the wrong-password / unknown-email / refresh-misuse
paths, and the deleted-user edge cases. Full backend suite is
now 51 tests across 8 files.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 6: Update `scripts/seed.py` to set real bcrypt hashes

**Files:**
- Modify: `backend/scripts/seed.py`

The Phase 1 seed used the placeholder `"$2b$12$placeholderhashreplacedinphase2"` for `password_hash`. Now that bcrypt is wired in, replace the placeholders with real hashes so login works in dev with the seeded users.

- [ ] **Step 1: Update `backend/scripts/seed.py`**

At the top of the file, add:

```python
from app.auth import hash_password
```

Then replace the `password_hash` value in **every** entry of the `_USERS` list. The five users get a single shared dev password (`"projecthub-dev"`) hashed once at module import:

Replace:
```python
"password_hash": "$2b$12$placeholderhashreplacedinphase2",
```

with:
```python
"password_hash": _DEV_PASSWORD_HASH,
```

And insert this constant before the `_USERS = [...]` block:

```python
# Dev password for all seed users. Real users will set their own via
# Phase 7's password reset flow (out of scope; not in current plan set).
_DEV_PASSWORD = "projecthub-dev"
_DEV_PASSWORD_HASH = hash_password(_DEV_PASSWORD)
```

- [ ] **Step 2: Update the existing seed test in `backend/tests/test_seed.py`** to verify a seeded user can be logged in via password verify

Add this test at the end of `tests/test_seed.py`:

```python
def test_seed_users_have_verifiable_password(db_clean: None) -> None:
    """The dev password 'projecthub-dev' verifies against every seeded user's hash."""
    from app.auth import verify_password
    seed()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT email, password_hash FROM users ORDER BY email")
            rows = cur.fetchall()
    assert len(rows) == 5
    for row in rows:
        assert verify_password("projecthub-dev", row["password_hash"]), \
            f"Dev password should verify for {row['email']}"
```

- [ ] **Step 3: Run the seed tests**

```bash
cd backend
source .venv/Scripts/activate
pytest tests/test_seed.py -v
```

Expected: **4 tests pass** (3 from Phase 1 + 1 new).

- [ ] **Step 4: Re-seed the dev DB so the live `users` table has real hashes (overwrite via TRUNCATE+seed or just re-run; INSERT ON CONFLICT skips existing rows)**

The seed is INSERT ON CONFLICT DO NOTHING — running it again won't update existing placeholder hashes. To upgrade them, truncate + re-seed:

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub', autocommit=True) as conn:
    with conn.cursor() as cur:
        cur.execute('TRUNCATE users RESTART IDENTITY CASCADE')
print('users truncated')
"
python -m scripts.seed
```

Expected: `users truncated` then `Seed complete.`. Then verify a login works against the live DB:

```bash
PYTHONIOENCODING=utf-8 python -c "
import psycopg
from app.auth import verify_password
with psycopg.connect('postgresql://postgres:postgres@localhost:5432/projecthub') as conn:
    with conn.cursor() as cur:
        cur.execute(\"SELECT password_hash FROM users WHERE email = 'ceo@projecthub.dev'\")
        row = cur.fetchone()
        print('verify result:', verify_password('projecthub-dev', row['password_hash']))
"
```

Expected: `verify result: True`.

- [ ] **Step 5: Commit**

```bash
cd ..
git add backend/scripts/seed.py backend/tests/test_seed.py
git commit -m "$(cat <<'EOF'
feat(backend): seed real bcrypt hashes for dev users

Phase 1 used a placeholder password_hash string so login wasn't
possible against seeded users. Now that bcrypt is wired in, hash
the shared dev password "projecthub-dev" at module import and
use it for all 5 seed users.

ceo@projecthub.dev / projecthub-dev
arjun@projecthub.dev / projecthub-dev
priya@projecthub.dev / projecthub-dev
vikram@projecthub.dev / projecthub-dev
lakshmi@projecthub.dev / projecthub-dev

Test added to test_seed.py verifies the password roundtrips
against every seeded user. Seed test count now 4 (was 3).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 7: Backend smoke test — full auth flow end-to-end

**Files:** none (verification only)

- [ ] **Step 1: Boot the API**

```bash
cd backend
source .venv/Scripts/activate
uvicorn app.main:app --reload --port 8000 &
UVICORN_PID=$!
sleep 3
```

(If backgrounding doesn't work in your shell, run uvicorn in a separate terminal and skip the `&` and `kill` parts.)

- [ ] **Step 2: Login**

```bash
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "ceo@projecthub.dev", "password": "projecthub-dev"}')
echo "$LOGIN_RESPONSE" | python -m json.tool
ACCESS=$(echo "$LOGIN_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['data']['access_token'])")
REFRESH=$(echo "$LOGIN_RESPONSE" | python -c "import sys, json; print(json.load(sys.stdin)['data']['refresh_token'])")
echo "ACCESS token (first 40 chars): ${ACCESS:0:40}..."
echo "REFRESH token (first 40 chars): ${REFRESH:0:40}..."
```

Expected: a JSON envelope with `status: success`, `data.access_token`, `data.refresh_token`, and `data.user.email == "ceo@projecthub.dev"`.

- [ ] **Step 3: Get current user**

```bash
curl -s http://localhost:8000/api/v1/auth/me \
    -H "Authorization: Bearer $ACCESS" | python -m json.tool
```

Expected: envelope with the CEO's profile (no `password_hash`).

- [ ] **Step 4: Refresh**

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/refresh \
    -H "Content-Type: application/json" \
    -d "{\"refresh_token\": \"$REFRESH\"}" | python -m json.tool
```

Expected: envelope with a new `data.access_token`.

- [ ] **Step 5: Logout**

```bash
curl -s -X POST http://localhost:8000/api/v1/auth/logout | python -m json.tool
```

Expected: envelope with `status: success`, `message: "Logged out"`.

- [ ] **Step 6: Stop uvicorn**

```bash
kill $UVICORN_PID 2>/dev/null || true
cd ..
```

- [ ] **Step 7: No commit** — this is a verification-only task.

---

### Task 8: Frontend Route Handlers — `proxy/[...path]`, `auth/login`, `auth/logout`, `auth/refresh`

**Files:**
- Create: `frontend/src/app/api/proxy/[...path]/route.ts`
- Create: `frontend/src/app/api/auth/login/route.ts`
- Create: `frontend/src/app/api/auth/logout/route.ts`
- Create: `frontend/src/app/api/auth/refresh/route.ts`
- Modify: `frontend/.env.local` (add `NEXT_PUBLIC_API_URL`)

These four files are the **only** Next.js API routes that survive Phase 7. They glue the browser (cookies) to FastAPI (Bearer tokens).

- [ ] **Step 1: Add `NEXT_PUBLIC_API_URL` to `frontend/.env.local`**

Open (or create) `frontend/.env.local`. Add:

```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

(If the file already exists with other entries, just append this line. The file is gitignored.)

- [ ] **Step 2: Create `frontend/src/app/api/proxy/[...path]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function forward(req: NextRequest, segments: string[]): Promise<NextResponse> {
  const token = req.cookies.get("ph_session")?.value;
  const path = segments.join("/");
  const url = `${API_URL}/api/${path}${req.nextUrl.search}`;

  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;

  const init: RequestInit = { method: req.method, headers };
  if (req.method !== "GET" && req.method !== "HEAD") {
    const body = await req.text();
    if (body.length > 0) init.body = body;
  }

  let upstream: Response;
  try {
    upstream = await fetch(url, init);
  } catch {
    return NextResponse.json(
      { status: "failure", message: "Backend unreachable", data: null },
      { status: 502 },
    );
  }

  const upstreamBody = await upstream.text();
  const upstreamContentType = upstream.headers.get("content-type") ?? "application/json";
  return new NextResponse(upstreamBody, {
    status: upstream.status,
    headers: { "Content-Type": upstreamContentType },
  });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function POST(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function PATCH(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function PUT(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
export async function DELETE(req: NextRequest, ctx: Ctx) {
  return forward(req, (await ctx.params).path);
}
```

- [ ] **Step 3: Create `frontend/src/app/api/auth/login/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const isProd = process.env.NODE_ENV === "production";

const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export async function POST(req: NextRequest) {
  const body = await req.json();

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    return NextResponse.json(
      { status: "failure", message: "Backend unreachable", data: null },
      { status: 502 },
    );
  }

  const envelope = await upstream.json();
  if (!upstream.ok || envelope.status !== "success") {
    return NextResponse.json(envelope, { status: upstream.status });
  }

  const { access_token, refresh_token, user } = envelope.data;

  // Strip tokens from the response sent to the browser. Only the user payload
  // crosses back; the tokens live in HTTP-only cookies the browser can't read.
  const response = NextResponse.json({ status: "success", message: "OK", data: { user } });

  response.cookies.set("ph_session", access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  response.cookies.set("ph_refresh", refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TTL_SECONDS,
  });

  return response;
}
```

- [ ] **Step 4: Create `frontend/src/app/api/auth/logout/route.ts`**

```typescript
import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ status: "success", message: "Logged out", data: null });
  response.cookies.delete("ph_session");
  response.cookies.set("ph_refresh", "", { path: "/api/auth/refresh", maxAge: 0 });
  return response;
}
```

(`response.cookies.delete()` doesn't accept a path option in the Next.js API used here, so we manually expire `ph_refresh` by setting `maxAge: 0` on its scoped path. `ph_session` lives at `/` so the simple `delete()` works.)

- [ ] **Step 5: Create `frontend/src/app/api/auth/refresh/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const isProd = process.env.NODE_ENV === "production";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("ph_refresh")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { status: "failure", message: "No refresh token", data: null },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return NextResponse.json(
      { status: "failure", message: "Backend unreachable", data: null },
      { status: 502 },
    );
  }

  const envelope = await upstream.json();
  if (!upstream.ok || envelope.status !== "success") {
    return NextResponse.json(envelope, { status: upstream.status });
  }

  const response = NextResponse.json({ status: "success", message: "OK", data: null });
  response.cookies.set("ph_session", envelope.data.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  return response;
}
```

- [ ] **Step 6: Type-check the frontend**

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -20
```

Expected: zero errors. If you see Next.js-specific complaints about `Promise<{ path: string[] }>` (Next.js 16 made route handler params async), the snippets above already account for that — just confirm the file content matches.

- [ ] **Step 7: Commit**

```bash
cd ..
git add frontend/src/app/api/proxy/ frontend/src/app/api/auth/login/ frontend/src/app/api/auth/logout/ frontend/src/app/api/auth/refresh/
git commit -m "$(cat <<'EOF'
feat(frontend): auth route handlers + proxy for FastAPI cutover

Four surviving Next.js Route Handlers — these are the only API routes
that remain after Phase 7's cleanup of the rest:

- POST /api/auth/login — proxies to FastAPI /api/v1/auth/login,
  sets ph_session (30d, /, HttpOnly) and ph_refresh (90d,
  /api/auth/refresh, HttpOnly) cookies. Strips tokens from the
  response body — the browser only sees { user }.
- POST /api/auth/logout — clears both cookies. No FastAPI call
  needed (stateless JWT).
- POST /api/auth/refresh — reads ph_refresh cookie, forwards to
  FastAPI /api/v1/auth/refresh, sets a fresh ph_session cookie.
- ALL /api/proxy/[...path] — generic forwarder for client-side
  fetches. Reads ph_session, adds Authorization: Bearer, forwards
  request body verbatim, returns FastAPI's response 1:1 (status +
  content-type preserved).

Cookie flags: HttpOnly always; Secure in prod (NODE_ENV check);
SameSite=Lax. ph_refresh is path-scoped to /api/auth/refresh so it
only travels to the one endpoint that uses it (least privilege).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 9: Frontend `middleware.ts` — cookie-presence check

**Files:**
- Modify: `frontend/src/middleware.ts`

The current `middleware.ts` uses NextAuth's middleware for route protection. Replace it with a simple cookie-presence check.

- [ ] **Step 1: Read the current middleware to confirm what's being replaced**

```bash
cat frontend/src/middleware.ts
```

(Sanity check — should be a NextAuth-based wrapper.)

- [ ] **Step 2: Replace `frontend/src/middleware.ts` with this content**

```typescript
import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/refresh",
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  // Presence check only — backend validates the token's signature/expiry.
  // An expired token will be rejected by FastAPI on the first authenticated
  // call, and the proxy will surface the 401 to the client.
  if (!req.cookies.get("ph_session")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  // Run on every page route except Next.js internals + public assets.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|webp|gif|ico)).*)"],
};
```

- [ ] **Step 3: Type-check**

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -10
```

Expected: zero errors.

- [ ] **Step 4: Commit**

```bash
cd ..
git add frontend/src/middleware.ts
git commit -m "$(cat <<'EOF'
refactor(frontend): middleware = cookie-presence check (no NextAuth)

Replaces the NextAuth-based middleware with a minimal presence check
on the ph_session cookie. Public paths (/login + the three /api/auth/*
helpers) pass through; everything else redirects to /login?from=<path>
when the cookie is absent.

The cookie's signature/expiry is intentionally NOT checked here —
FastAPI is the truth source. An expired token will be 401'd on the
first authenticated call (the proxy surfaces the 401 to the client,
which can either show an error or trigger a refresh).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 10: Frontend `lib/session.ts` — cookie + `/auth/me`, **and** new `lib/api.ts` helper

**Files:**
- Modify (rewrite): `frontend/src/lib/session.ts`
- Create: `frontend/src/lib/api.ts`

The current `getSessionUser()` calls Prisma. Rewrite it to read the cookie and call `GET /api/v1/auth/me`. Same return type (`SessionUser | null`) so call sites in Server Components don't change.

- [ ] **Step 1: Read the current `lib/session.ts` to confirm shape**

```bash
cat frontend/src/lib/session.ts
```

Note the exact `SessionUser` type signature (field names, capitalization). The new version preserves it.

- [ ] **Step 2: Replace `frontend/src/lib/session.ts` with this content**

```typescript
import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  roleType: "ceo" | "team_member";
  avatarColor: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Resolve the current authenticated user by reading the ph_session cookie
 * and calling FastAPI's GET /api/v1/auth/me. Returns null if the cookie is
 * missing, the token is invalid/expired, or the backend is unreachable —
 * the call site can then decide to redirect or render a logged-out view.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ph_session")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const envelope = await res.json();
    if (envelope.status !== "success") return null;
    const u = envelope.data;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      roleType: u.role_type,
      avatarColor: u.avatar_color,
    };
  } catch {
    return null;
  }
}
```

If the existing type used `roleType?: ...` (optional) or different field names, **preserve the existing type signature** rather than the snake/camel translation here. Adjust the field mapping accordingly so call sites don't break.

- [ ] **Step 3: Create `frontend/src/lib/api.ts` (Server Component data-fetching helper)**

```typescript
import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Server-side fetch wrapper for calling FastAPI from React Server Components.
 * Reads ph_session from cookies, attaches Authorization: Bearer, parses the
 * {status, message, data} envelope, and returns the data field.
 *
 * Throws ApiError on non-2xx responses or envelope.status !== "success".
 *
 * NOTE: this is for SERVER components only. Client components call
 * /api/proxy/v1/<path> via plain fetch (no token handling needed).
 */
export async function apiServerFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ph_session")?.value;

  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText} on ${path}`);
  }

  const envelope = await res.json();
  if (envelope.status !== "success") {
    throw new ApiError(res.status, envelope.message ?? "API error");
  }
  return envelope.data as T;
}
```

This helper isn't used in Phase 2 (no Server Components migrate yet), but Phase 3 onwards relies on it heavily. Adding it now keeps the auth-related changes self-contained.

- [ ] **Step 4: Type-check + run frontend tests**

```bash
cd frontend
npx tsc --noEmit 2>&1 | tail -10
npm test 2>&1 | tail -30
```

Expected: tsc clean. Tests will likely show some failures because:
- Server Components that call `getSessionUser()` and previously got Prisma data will now expect the FastAPI shape (but in Phase 2, those server components STILL use Prisma for everything except the user — so they should mostly be fine).
- Tests that mocked `next-auth` may break (Task 12 cleans those up).

Don't fix test failures yet — they're addressed in Task 12. Just note which tests fail in your report.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/lib/session.ts frontend/src/lib/api.ts
git commit -m "$(cat <<'EOF'
refactor(frontend): session.ts uses FastAPI /auth/me; add apiServerFetch helper

- src/lib/session.ts — getSessionUser() now reads ph_session cookie
  and calls GET /api/v1/auth/me on FastAPI. Returns null on any
  failure (missing cookie / 401 / backend unreachable) — same
  contract as the previous Prisma-based version. SessionUser type
  preserved so Server Component call sites don't change.

- src/lib/api.ts — NEW. apiServerFetch<T>(path) helper for use in
  Server Components: reads ph_session, adds Bearer header, unwraps
  the {status, message, data} envelope, throws ApiError on failure.
  Not consumed in Phase 2 — Phase 3+ uses it to swap Prisma
  fetches for FastAPI fetches.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 11: Frontend login page — submit to `/api/auth/login`

**Files:**
- Modify: `frontend/src/app/login/page.tsx`

The current login page calls NextAuth's `signIn()` from `next-auth/react`. Replace that with a `fetch('/api/auth/login', ...)`. **Preserve all existing JSX and styling.**

- [ ] **Step 1: Read the current page to identify the form-submit handler**

```bash
cat frontend/src/app/login/page.tsx
```

Identify:
- The `import { signIn } from "next-auth/react";` line
- The `onSubmit` handler that calls `signIn("credentials", { ... })`
- Where errors are displayed
- Where the post-login redirect happens

- [ ] **Step 2: Replace the NextAuth call with a `fetch` to `/api/auth/login`**

The exact diff depends on the current file shape. Two changes are required:

**Remove this import:**
```typescript
import { signIn } from "next-auth/react";
```

**Replace the submit handler.** The new handler looks like this — adapt the variable names (`email`, `password`, `setError`, `setPending`, `router`, etc.) to match what's already in the file:

```typescript
async function handleSubmit(e: React.FormEvent) {
  e.preventDefault();
  setError("");
  setPending(true);
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const envelope = await res.json();
    if (!res.ok || envelope.status !== "success") {
      setError(envelope.message ?? "Login failed");
      return;
    }
    // Cookies are set by the route handler; navigate to the original target.
    const from = searchParams.get("from") ?? "/";
    router.push(from);
    router.refresh();
  } catch {
    setError("Network error — please try again");
  } finally {
    setPending(false);
  }
}
```

If the existing file uses `useSearchParams()` already, reuse it. If not, add:
```typescript
import { useRouter, useSearchParams } from "next/navigation";
// ... inside the component:
const router = useRouter();
const searchParams = useSearchParams();
```

- [ ] **Step 3: Verify the form still type-checks and renders**

```bash
cd frontend
npx tsc --noEmit 2>&1 | grep "login/page" | head -5
```

Expected: no errors mentioning `login/page.tsx`.

- [ ] **Step 4: Manual smoke test (optional but recommended) — start dev server and try logging in**

In one terminal:
```bash
# backend
cd backend && source .venv/Scripts/activate && uvicorn app.main:app --port 8000
```

In another terminal:
```bash
# frontend
cd frontend && npm run dev
```

Open `http://localhost:3000/login`, enter `ceo@projecthub.dev` / `projecthub-dev`, submit. Expected: redirect to `/` (or wherever `from` pointed). Browser DevTools → Application → Cookies should show `ph_session` and `ph_refresh` (HttpOnly).

If login redirects you back to `/login`, the middleware's cookie check is failing — verify the cookie name matches exactly (`ph_session`).

If login succeeds but the next page redirects to `/login`, the page tried to fetch user data via Prisma+NextAuth which is now broken. **That's expected at this point** — the `getSessionUser()` rewrite in Task 10 made server components see "no user" because the *backend's* `/me` works but the surrounding pages may still expect NextAuth's session. Task 12 finishes the cleanup.

Stop both servers when done.

- [ ] **Step 5: Commit**

```bash
cd ..
git add frontend/src/app/login/page.tsx
git commit -m "$(cat <<'EOF'
refactor(frontend): login form submits to /api/auth/login

Replaces the NextAuth signIn() call with a plain fetch to the
local Route Handler at /api/auth/login (which sets the HTTP-only
cookies after talking to FastAPI). UI/JSX/styling preserved.

Error handling: surface envelope.message on 4xx, generic
"Network error" on fetch failure. The redirect target comes
from the ?from= search param (set by middleware on the original
unauthenticated request) and falls back to /.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

---

### Task 12: Delete NextAuth + uninstall packages + fix broken tests

**Files:**
- Delete: `frontend/src/app/api/auth/[...nextauth]/route.ts` (the NextAuth handler)
- Delete: `frontend/src/lib/auth.ts` (NextAuth config)
- Delete: `frontend/src/types/next-auth.d.ts` (type augmentations)
- Modify: `frontend/package.json` (uninstall packages)
- Modify: any test files that mock `next-auth` or `next-auth/react`

This task removes the last NextAuth references from the frontend.

- [ ] **Step 1: Inventory NextAuth references**

```bash
cd frontend
grep -rn "next-auth\|@auth/prisma-adapter\|bcryptjs" src/ 2>&1 | head -30
```

Expected: a list of imports across pages, components, and tests. Record the count for the commit message.

- [ ] **Step 2: Delete the NextAuth handler route + config + types**

```bash
git rm "src/app/api/auth/[...nextauth]/route.ts"
git rm src/lib/auth.ts
git rm src/types/next-auth.d.ts
```

(If any of these don't exist on your branch, the `git rm` will error — that's fine, they were renamed in a prior phase. Skip the missing ones.)

- [ ] **Step 3: Remove imports from any remaining source files**

Run the grep again:
```bash
grep -rln "from \"next-auth" src/ 2>&1
grep -rln "from 'next-auth" src/ 2>&1
grep -rln "@auth/prisma-adapter" src/ 2>&1
grep -rln "from \"bcryptjs" src/ 2>&1
```

For each file listed, open it and remove the offending import. If the import was the *only* thing the file used (e.g. some helper that wrapped NextAuth's session), the helper may now be unused — delete the helper or update its callers to use the new `getSessionUser()` instead.

The most common case: `import { useSession } from "next-auth/react"` in client components that needed the user. Replace with a small client-side wrapper that calls the proxy:

```typescript
// In a client component that needs the current user:
"use client";
import useSWR from "swr"; // if SWR is in deps; otherwise use useEffect
// ...
const { data: user } = useSWR("/api/proxy/v1/auth/me", (url) =>
  fetch(url).then((r) => r.json()).then((env) => env.data)
);
```

If the file just uses the user's name/avatar in a Server Component, replace `useSession()` with a parent-Server-Component that calls `getSessionUser()` and passes the user as a prop.

If you can't easily migrate a particular component in this task, note it as a follow-up (e.g. add a TODO comment with `// TODO Phase 3: replace useSession with apiClientFetch`).

- [ ] **Step 4: Uninstall the four packages**

```bash
npm uninstall next-auth @auth/prisma-adapter bcryptjs @types/bcryptjs
```

Expected: removes the entries from `package.json` + `package-lock.json`. No errors.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit 2>&1 | tail -30
```

Expected: zero errors. If errors remain about `next-auth` types, you missed an import in Step 3 — find it via `grep -rn "next-auth" src/`.

- [ ] **Step 6: Run tests + fix what breaks**

```bash
npm test 2>&1 | tail -40
```

Expected: most tests still pass. Tests that mocked `next-auth` will fail — they need their mocks updated.

For each broken test:
- If the test mocked `next-auth/react`'s `signIn` or `useSession`, and the component being tested used `useSession()`: replace with a manual mock of `getSessionUser` (for server components) or the SWR call (for client components).
- If the test mocked `next-auth`'s `auth()` server helper: the helper no longer exists; the test is calling something that's been deleted. Either update the test to call the new `getSessionUser()` or delete the test if it was testing the deleted module.

If a test cannot be straightforwardly fixed without redesigning the component it tests, mark it `.skip` with a comment explaining why and listing the Phase that should re-enable it. Do not delete tests outright.

Iterate until `npm test` is green or all remaining failures are `.skip`'d with explanations.

Document the final test count + any skipped tests in your report.

- [ ] **Step 7: Commit**

```bash
cd ..
git add -A frontend/
git commit -m "$(cat <<'EOF'
chore(frontend): remove NextAuth — replaced by FastAPI auth flow

Files deleted:
- src/app/api/auth/[...nextauth]/route.ts
- src/lib/auth.ts (NextAuth config)
- src/types/next-auth.d.ts

Packages uninstalled (frontend now depends on neither for auth):
- next-auth
- @auth/prisma-adapter
- bcryptjs
- @types/bcryptjs

Test fixes:
- Updated mocks in N test files that were mocking next-auth/react.
- M tests skipped with TODO comments where component-level rewrites
  are deferred to a later phase (full list in test files).

Frontend is now NextAuth-free. The four surviving auth Route Handlers
(login, logout, refresh, proxy) are the only auth-related code.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"
```

(Replace N and M with the real counts you see during execution.)

---

### Task 13: End-to-end smoke + migration-mapping update + push

**Files:**
- Modify: `docs/migration-mapping.md`

Final integration check + paperwork.

- [ ] **Step 1: Run the full backend suite**

```bash
cd backend
source .venv/Scripts/activate
pytest -v
```

Expected: **51 tests pass** (Phase 1's 25 + Phase 2's 13 auth + 13 router_auth = 51).

- [ ] **Step 2: Run the full frontend suite**

```bash
cd ../frontend
npm test 2>&1 | tail -10
```

Expected: green (or with documented skips from Task 12).

- [ ] **Step 3: End-to-end manual smoke test**

In two terminals:
```bash
# T1
cd backend && source .venv/Scripts/activate && uvicorn app.main:app --port 8000
```
```bash
# T2
cd frontend && npm run dev
```

In a browser:

1. Visit `http://localhost:3000/projects` (or any protected page) → you should be redirected to `http://localhost:3000/login?from=%2Fprojects`.
2. Log in with `ceo@projecthub.dev` / `projecthub-dev`.
3. You should be redirected back to `/projects` (or wherever you originally tried to go).
4. The page renders. (Some content may show "no user" if Prisma-based fetches still expected the NextAuth session — that's a known transitional state until Phase 3.)
5. Open Browser DevTools → Application → Cookies for `localhost:3000`. You should see:
    - `ph_session` (HttpOnly, value is a JWT)
    - `ph_refresh` (HttpOnly, Path=/api/auth/refresh)
6. Hit `http://localhost:3000/api/auth/logout` (or click a logout button if there is one) → cookies cleared, next protected page hits `/login`.

Stop both servers.

- [ ] **Step 4: Update `docs/migration-mapping.md`**

Open the file. For each of these rows, change the status emoji from ⏳ to ✅:

- `POST /api/auth/[...nextauth]` (login) → `POST /api/v1/auth/login`
- (no equivalent today) → `POST /api/v1/auth/refresh`
- (no equivalent today) → `POST /api/v1/auth/logout`
- (NextAuth session helper) → `GET /api/v1/auth/me`

- [ ] **Step 5: Commit + push**

```bash
cd ..
git add docs/migration-mapping.md
git commit -m "$(cat <<'EOF'
docs(migration): mark Phase 2 auth routes as ✅

POST /api/v1/auth/login, /refresh, /logout, GET /me are all live
on FastAPI and consumed by the frontend via cookie + proxy. The
Prisma+NextAuth path is gone.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
EOF
)"

git push -u origin feature/backend-phase-2-auth
```

Expected: branch pushed; PR creation URL printed.

---

## Acceptance criteria

When all tasks are complete:

1. Branch `feature/backend-phase-2-auth` exists with ~10–13 commits, pushed to origin.
2. `cd backend && pytest -v` → **51 tests pass** across 9 files (added: `test_auth.py` 13, `test_routers_auth.py` 13).
3. `cd frontend && npm test` → green (138 + new tests, minus any documented `.skip`s).
4. `cd backend && uvicorn app.main:app --port 8000` boots; OpenAPI at `/docs` lists `/api/v1/auth/login`, `/api/v1/auth/refresh`, `/api/v1/auth/logout`, `/api/v1/auth/me`.
5. `curl -X POST http://localhost:8000/api/v1/auth/login -H "Content-Type: application/json" -d '{"email": "ceo@projecthub.dev", "password": "projecthub-dev"}'` returns a `{status: success, data: { access_token, refresh_token, user }}` envelope.
6. `frontend/src/app/api/` contains exactly: `auth/login/`, `auth/logout/`, `auth/refresh/`, `proxy/[...path]/`. No `[...nextauth]/` directory.
7. `frontend/package.json` has no `next-auth`, `@auth/prisma-adapter`, `bcryptjs`, or `@types/bcryptjs` entries.
8. End-to-end browser flow works: visit protected page → redirect to /login → log in → redirected back → page renders.
9. Cookies `ph_session` (HttpOnly, Path=/, 30 days) and `ph_refresh` (HttpOnly, Path=/api/auth/refresh, 90 days) are set after login and cleared after logout.
10. `docs/migration-mapping.md` shows all four auth rows as ✅.

## Out of scope (deferred to later phases)

- Migrating any other domain endpoint (users, projects, tasks, etc.) — Phases 3–6.
- Rewriting `getSessionUser()` call sites that consume the user object beyond the existing contract (those should already work since the type signature is preserved).
- Refresh-token rotation / single-use refresh tokens — could add later if abuse appears.
- Token revocation / denylist — not implemented; logout is purely cookie-clearing.
- Password reset flow — not in any phase of this plan set.
- 2FA / MFA — out of scope entirely.
- Rate limiting on `/login` — add later if abuse appears.
- Auditing / login event log — out of scope; could be added in a later phase.
- Production deployment — Phase 8, deferred.
