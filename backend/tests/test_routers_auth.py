"""Integration tests for /api/v1/auth/* endpoints."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token, issue_refresh_token
from app.db import get_conn

_KNOWN_EMAIL = "auth-test-user@projecthub.dev"
_KNOWN_PASSWORD = "correct-horse-battery-staple"


@pytest.fixture
def known_user(db_clean: None) -> str:
    """Insert a known-credentials user and return its UUID as a string."""
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

def test_login_correct_credentials_returns_tokens(client: TestClient, known_user: str) -> None:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": _KNOWN_EMAIL, "password": _KNOWN_PASSWORD},
    )
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "success"
    data = body["data"]
    assert "access_token" in data
    assert "refresh_token" in data
    assert data["user"]["email"] == _KNOWN_EMAIL
    assert data["user"]["role_type"] == "ceo"
    assert "password_hash" not in data["user"]


def test_login_wrong_password_returns_401(client: TestClient, known_user: str) -> None:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": _KNOWN_EMAIL, "password": "totally-wrong"},
    )
    assert resp.status_code == 401
    assert resp.json()["status"] == "failure"


def test_login_unknown_email_returns_401(client: TestClient, db_clean: None) -> None:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "ghost@projecthub.dev", "password": "whatever"},
    )
    assert resp.status_code == 401


def test_login_invalid_email_format_returns_422(client: TestClient, db_clean: None) -> None:
    resp = client.post(
        "/api/v1/auth/login",
        json={"email": "not-an-email", "password": "x"},
    )
    assert resp.status_code == 422


# ----- GET /me -----

def test_me_with_valid_token_returns_user(client: TestClient, known_user: str) -> None:
    token = issue_access_token(known_user, "ceo")
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] == "success"
    assert body["data"]["email"] == _KNOWN_EMAIL


def test_me_without_token_returns_401(client: TestClient) -> None:
    assert client.get("/api/v1/auth/me").status_code == 401


def test_me_with_refresh_token_returns_401(client: TestClient, known_user: str) -> None:
    token = issue_refresh_token(known_user)
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 401


def test_me_deleted_user_returns_404(client: TestClient, db_clean: None) -> None:
    token = issue_access_token("00000000-0000-0000-0000-000000000000", "ceo")
    resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert resp.status_code == 404


# ----- POST /refresh -----

def test_refresh_valid_refresh_token_returns_new_access(client: TestClient, known_user: str) -> None:
    refresh = issue_refresh_token(known_user)
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 200, resp.text
    body = resp.json()
    assert body["status"] == "success"
    assert "access_token" in body["data"]


def test_refresh_with_access_token_returns_401(client: TestClient, known_user: str) -> None:
    access = issue_access_token(known_user, "ceo")
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": access})
    assert resp.status_code == 401


def test_refresh_invalid_token_returns_401(client: TestClient, db_clean: None) -> None:
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": "not-a-real-jwt"})
    assert resp.status_code == 401


def test_refresh_deleted_user_returns_401(client: TestClient, db_clean: None) -> None:
    refresh = issue_refresh_token("00000000-0000-0000-0000-000000000000")
    resp = client.post("/api/v1/auth/refresh", json={"refresh_token": refresh})
    assert resp.status_code == 401


# ----- POST /logout -----

def test_logout_returns_success(client: TestClient) -> None:
    resp = client.post("/api/v1/auth/logout")
    assert resp.status_code == 200
    assert resp.json()["status"] == "success"
