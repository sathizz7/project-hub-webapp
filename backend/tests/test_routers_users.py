"""Integration tests for /api/v1/users."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def two_users(db_clean: None) -> dict:
    """Seed a CEO + a member; return ids and tokens for both."""
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Alice CEO', 'alice@x.com', 'Founder', 'ceo', '#000', %s),
                       ('Bob Member', 'bob@x.com', 'Engineer', 'team_member', '#FFF', %s)
                RETURNING id, role_type
                """,
                (pw, pw),
            )
            rows = cur.fetchall()
        conn.commit()
    by_role = {r["role_type"]: str(r["id"]) for r in rows}
    return {
        "ceo_id": by_role["ceo"],
        "member_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "member_token": issue_access_token(by_role["team_member"], "team_member"),
        "ceo_email": "alice@x.com",
        "member_email": "bob@x.com",
    }


# ----- GET /users -----

def test_list_users_returns_seeded(client: TestClient, two_users: dict) -> None:
    resp = client.get("/api/v1/users", headers=_bearer(two_users["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert isinstance(data, list)
    emails = [u["email"] for u in data]
    assert two_users["ceo_email"] in emails
    assert two_users["member_email"] in emails


def test_list_users_no_password_hash(client: TestClient, two_users: dict) -> None:
    resp = client.get("/api/v1/users", headers=_bearer(two_users["ceo_token"]))
    for u in resp.json()["data"]:
        assert "password_hash" not in u


def test_list_users_unauthenticated(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/users").status_code == 401


# ----- GET /users/{id} -----

def test_get_user_by_id(client: TestClient, two_users: dict) -> None:
    resp = client.get(
        f"/api/v1/users/{two_users['ceo_id']}",
        headers=_bearer(two_users["ceo_token"]),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == two_users["ceo_email"]


def test_get_user_unknown_returns_404(client: TestClient, two_users: dict) -> None:
    resp = client.get(
        "/api/v1/users/00000000-0000-0000-0000-000000000000",
        headers=_bearer(two_users["ceo_token"]),
    )
    assert resp.status_code == 404


# ----- POST /users -----

def test_create_user_as_ceo(client: TestClient, two_users: dict) -> None:
    resp = client.post(
        "/api/v1/users",
        headers=_bearer(two_users["ceo_token"]),
        json={
            "name": "New User",
            "email": "new@x.com",
            "role": "Engineer",
            "role_type": "team_member",
            "avatar_color": "#123",
            "password": "freshpassword",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["email"] == "new@x.com"
    assert "password_hash" not in data


def test_create_user_as_member_forbidden(client: TestClient, two_users: dict) -> None:
    resp = client.post(
        "/api/v1/users",
        headers=_bearer(two_users["member_token"]),
        json={
            "name": "X",
            "email": "x@x.com",
            "role": "Y",
            "role_type": "team_member",
            "avatar_color": "#000",
            "password": "p",
        },
    )
    assert resp.status_code == 403


def test_create_user_duplicate_email(client: TestClient, two_users: dict) -> None:
    """Inserting a duplicate email returns a client error (DB unique constraint)."""
    resp = client.post(
        "/api/v1/users",
        headers=_bearer(two_users["ceo_token"]),
        json={
            "name": "Dup",
            "email": two_users["ceo_email"],
            "role": "X",
            "role_type": "team_member",
            "avatar_color": "#000",
            "password": "p",
        },
    )
    assert resp.status_code in (400, 409)


# ----- PATCH /users/{id} -----

def test_patch_user_as_ceo(client: TestClient, two_users: dict) -> None:
    resp = client.patch(
        f"/api/v1/users/{two_users['member_id']}",
        headers=_bearer(two_users["ceo_token"]),
        json={"name": "Bob Renamed"},
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["name"] == "Bob Renamed"


def test_patch_user_as_member_forbidden(client: TestClient, two_users: dict) -> None:
    resp = client.patch(
        f"/api/v1/users/{two_users['ceo_id']}",
        headers=_bearer(two_users["member_token"]),
        json={"name": "Hacked"},
    )
    assert resp.status_code == 403


def test_patch_user_unknown_returns_404(client: TestClient, two_users: dict) -> None:
    resp = client.patch(
        "/api/v1/users/00000000-0000-0000-0000-000000000000",
        headers=_bearer(two_users["ceo_token"]),
        json={"name": "Ghost"},
    )
    assert resp.status_code == 404


def test_patch_user_empty_body_returns_400(client: TestClient, two_users: dict) -> None:
    resp = client.patch(
        f"/api/v1/users/{two_users['member_id']}",
        headers=_bearer(two_users["ceo_token"]),
        json={},
    )
    assert resp.status_code == 400
