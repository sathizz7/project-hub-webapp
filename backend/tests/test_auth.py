"""Tests for app.auth — JWT + bcrypt + get_current_user + require_roles."""

from datetime import datetime, timedelta, timezone

import jwt
import pytest
from fastapi import FastAPI
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
    h = hash_password("hunter2")
    assert h.startswith("$2b$") or h.startswith("$2a$")
    assert len(h) >= 60


def test_verify_password_roundtrip() -> None:
    h = hash_password("correct horse battery staple")
    assert verify_password("correct horse battery staple", h) is True


def test_verify_password_wrong() -> None:
    h = hash_password("right")
    assert verify_password("wrong", h) is False


# ----- token issue + decode -----

def test_issue_and_decode_access_token() -> None:
    token = issue_access_token("user-123", "ceo")
    payload = decode_token(token)
    assert payload["user_id"] == "user-123"
    assert payload["role_type"] == "ceo"
    assert "exp" in payload
    assert "iat" in payload
    exp_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    delta = exp_dt - datetime.now(timezone.utc)
    assert timedelta(days=29) < delta < timedelta(days=31)


def test_issue_and_decode_refresh_token() -> None:
    token = issue_refresh_token("user-456")
    payload = decode_token(token)
    assert payload["user_id"] == "user-456"
    assert payload["type"] == "refresh"
    exp_dt = datetime.fromtimestamp(payload["exp"], tz=timezone.utc)
    delta = exp_dt - datetime.now(timezone.utc)
    assert timedelta(days=89) < delta < timedelta(days=91)


def test_decode_token_rejects_expired() -> None:
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
    bad = jwt.encode(
        {"user_id": "x", "role_type": "ceo"},
        "wrong-secret-32-chars-long-xxxxxx",
        algorithm="HS256",
    )
    with pytest.raises(jwt.InvalidTokenError):
        decode_token(bad)


# ----- get_current_user + require_roles -----

def _build_test_app() -> FastAPI:
    from fastapi import Depends
    app = FastAPI()

    @app.get("/who")
    def _who(user: CurrentUser = Depends(get_current_user)):
        return {"user_id": user.user_id, "role_type": user.role_type}

    @app.get("/ceo-only", dependencies=[Depends(require_roles("ceo"))])
    def _ceo_only():
        return {"ok": True}

    return app


def test_get_current_user_with_valid_token() -> None:
    client = TestClient(_build_test_app())
    token = issue_access_token("user-789", "team_member")
    resp = client.get("/who", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    assert resp.json() == {"user_id": "user-789", "role_type": "team_member"}


def test_get_current_user_missing_header() -> None:
    client = TestClient(_build_test_app(), raise_server_exceptions=False)
    assert client.get("/who").status_code == 401


def test_get_current_user_rejects_refresh_token() -> None:
    client = TestClient(_build_test_app(), raise_server_exceptions=False)
    refresh = issue_refresh_token("user-789")
    resp = client.get("/who", headers={"Authorization": f"Bearer {refresh}"})
    assert resp.status_code == 401


def test_require_roles_allows_matching_role() -> None:
    client = TestClient(_build_test_app())
    token = issue_access_token("user-1", "ceo")
    assert client.get("/ceo-only", headers={"Authorization": f"Bearer {token}"}).status_code == 200


def test_require_roles_rejects_mismatched_role() -> None:
    client = TestClient(_build_test_app(), raise_server_exceptions=False)
    token = issue_access_token("user-2", "team_member")
    assert client.get("/ceo-only", headers={"Authorization": f"Bearer {token}"}).status_code == 403


def test_constants_match_spec() -> None:
    assert ACCESS_TOKEN_TTL == timedelta(days=30)
    assert REFRESH_TOKEN_TTL == timedelta(days=90)
