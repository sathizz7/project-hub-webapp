"""Integration tests for /api/v1/deadline-extensions."""

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
                       ('Mem', 'm@x.com', 'E', 'team_member', '#FFF', %s)
                RETURNING id, role_type
                """,
                (pw, pw),
            )
            rows = cur.fetchall()
        conn.commit()
    by_role = {r["role_type"]: str(r["id"]) for r in rows}
    ctx = {
        "ceo_id": by_role["ceo"],
        "mem_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "mem_token": issue_access_token(by_role["team_member"], "team_member"),
    }
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(ctx["ceo_token"]),
        json={
            "title": "P", "type": "engineering", "priority": "low",
            "assignee_ids": [ctx["mem_id"]],
        },
    )
    ctx["project_id"] = resp.json()["data"]["id"]
    return ctx


# ----- POST -----

def test_create_extension_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
            "reason": "Need more time for testing",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["requested_by_id"] == setup["mem_id"]
    assert data["status"] == "pending"
    assert data["escalation_level"] == 0


def test_create_extension_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Other', 'o@x.com', 'X', 'team_member', '#000', %s)
                RETURNING id
                """,
                (pw,),
            )
            other_id = str(cur.fetchone()["id"])
        conn.commit()
    other_token = issue_access_token(other_id, "team_member")
    resp = client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(other_token),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    assert resp.status_code == 404


# ----- GET list -----

def test_list_extensions_member_sees_own(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get("/api/v1/deadline-extensions", headers=_bearer(setup["mem_token"]))
    rows = resp.json()["data"]
    assert all(r["requested_by_id"] == setup["mem_id"] for r in rows)
    assert len(rows) == 1


def test_list_extensions_ceo_sees_all(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get("/api/v1/deadline-extensions", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]) == 1


def test_list_extensions_filter_by_project(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get(
        f"/api/v1/deadline-extensions?project_id={setup['project_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert all(r["project_id"] == setup["project_id"] for r in resp.json()["data"])


def test_list_extensions_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/deadline-extensions").status_code == 401


# ----- PATCH -----

def test_patch_extension_as_ceo_approves(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    eid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/deadline-extensions/{eid}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved", "ceo_comment": "Sure, take the extra time"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "approved"
    assert data["approved_by_id"] == setup["ceo_id"]
    assert data["ceo_comment"] == "Sure, take the extra time"


def test_patch_extension_as_member_forbidden(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    eid = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/deadline-extensions/{eid}",
        headers=_bearer(setup["mem_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 403


def test_patch_extension_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        "/api/v1/deadline-extensions/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "approved"},
    )
    assert resp.status_code == 404
