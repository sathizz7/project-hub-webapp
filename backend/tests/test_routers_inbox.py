"""Integration tests for /api/v1/inbox."""

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


def test_inbox_includes_pending_leaves(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-03", "days": "3.0"},
    )
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data["pending_leaves"]) == 1
    leave = data["pending_leaves"][0]
    assert leave["user"]["id"] == setup["mem_id"]
    assert leave["type"] == "planned"


def test_inbox_includes_pending_extensions(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/deadline-extensions",
        headers=_bearer(setup["mem_token"]),
        json={
            "project_id": setup["project_id"],
            "original_deadline": "2026-06-01T00:00:00Z",
            "requested_deadline": "2026-06-14T00:00:00Z",
        },
    )
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    data = resp.json()["data"]
    assert len(data["pending_extensions"]) == 1
    ext = data["pending_extensions"][0]
    assert ext["requested_by"]["id"] == setup["mem_id"]
    assert ext["project_id"] == setup["project_id"]


def test_inbox_excludes_approved_items(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/leaves",
        headers=_bearer(setup["mem_token"]),
        json={"type": "planned", "start_date": "2026-06-01", "end_date": "2026-06-01", "days": "1.0"},
    )
    lid = create.json()["data"]["id"]
    client.patch(f"/api/v1/leaves/{lid}", headers=_bearer(setup["ceo_token"]), json={"status": "approved"})
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert len(resp.json()["data"]["pending_leaves"]) == 0


def test_inbox_empty_when_nothing_pending(setup: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    data = resp.json()["data"]
    assert data["pending_leaves"] == []
    assert data["pending_extensions"] == []


def test_inbox_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 403
