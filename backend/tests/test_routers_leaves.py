"""Integration tests for /api/v1/leaves."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
def setup(client: TestClient, db_clean: None) -> dict:
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('CEO', 'c@x.com', 'F', 'ceo', '#000', %s),
                       ('Mem', 'm@x.com', 'E', 'team_member', '#FFF', %s),
                       ('Other', 'o@x.com', 'X', 'team_member', '#AAA', %s)
                RETURNING id, role_type, email
                """,
                (pw, pw, pw),
            )
            rows = cur.fetchall()
        conn.commit()
    by_email = {r["email"]: str(r["id"]) for r in rows}
    return {
        "ceo_id": by_email["c@x.com"],
        "mem_id": by_email["m@x.com"],
        "other_id": by_email["o@x.com"],
        "ceo_token": issue_access_token(by_email["c@x.com"], "ceo"),
        "mem_token": issue_access_token(by_email["m@x.com"], "team_member"),
        "other_token": issue_access_token(by_email["o@x.com"], "team_member"),
    }


# ----- POST /leaves -----

def test_create_leave_as_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={
            "type": "planned",
            "start_date": "2026-06-01",
            "end_date": "2026-06-03",
            "days": "3.0",
            "reason": "vacation",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["user_id"] == setup["mem_id"]
    assert data["status"] == "pending"
    assert data["type"] == "planned"


def test_create_leave_user_id_derived_from_jwt(setup: dict, client: TestClient) -> None:
    """Even if caller passes user_id as an extra field, server uses caller's id."""
    resp = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={
            "type": "sick",
            "start_date": "2026-06-01",
            "end_date": "2026-06-01",
            "days": "1.0",
            "user_id": setup["other_id"],  # ignored by LeaveCreate
        },
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["data"]["user_id"] == setup["mem_id"]


def test_create_leave_unauth(client: TestClient, db_clean: None) -> None:
    resp = client.post(
        "/api/v1/leaves",
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    assert resp.status_code == 401


# ----- GET /leaves -----

def test_list_leaves_member_sees_own_only(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["other_token"]),
        json={"type": "sick", "start_date": "2026-06-02", "end_date": "2026-06-02", "days": "1.0"},
    )
    resp = client.get("/api/v1/leaves", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 200
    rows = resp.json()["data"]
    assert all(r["user_id"] == setup["mem_id"] for r in rows)
    assert len(rows) == 1


def test_list_leaves_ceo_sees_all(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["other_token"]),
        json={"type": "sick", "start_date": "2026-06-02", "end_date": "2026-06-02", "days": "1.0"},
    )
    resp = client.get("/api/v1/leaves", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]) == 2


def test_list_leaves_filter_by_status(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    client.patch(f"/api/v1/leaves/{lid}", headers=_bearer(setup["ceo_token"]), json={"status": "approved"})
    resp = client.get("/api/v1/leaves?status=pending", headers=_bearer(setup["ceo_token"]))
    assert resp.json()["data"] == []
    resp = client.get("/api/v1/leaves?status=approved", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]) == 1


# ----- GET /leaves/{id} -----

def test_get_leave_other_member_returns_404(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.get(f"/api/v1/leaves/{lid}", headers=_bearer(setup["other_token"]))
    assert resp.status_code == 404


def test_get_leave_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/leaves/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404


# ----- PATCH /leaves/{id} -----

def test_patch_leave_as_ceo_approves(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/leaves/{lid}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved", "cover_person_id": setup["other_id"]},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "approved"
    assert data["approved_by_id"] == setup["ceo_id"]
    assert data["cover_person_id"] == setup["other_id"]


def test_patch_leave_as_member_forbidden(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/leaves/{lid}",
        headers=_bearer(setup["mem_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 403


def test_patch_leave_empty_body_returns_400(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/leaves/{lid}",
        headers=_bearer(setup["ceo_token"]),
        json={},
    )
    assert resp.status_code == 400


def test_patch_leave_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        "/api/v1/leaves/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 404
