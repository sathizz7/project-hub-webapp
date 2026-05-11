"""Integration tests for /api/v1/projects/{id}/checkpoints."""

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
        "member_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "member_token": issue_access_token(by_role["team_member"], "team_member"),
    }
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(ctx["ceo_token"]),
        json={
            "title": "P", "type": "engineering", "priority": "low",
            "assignee_ids": [ctx["member_id"]],
        },
    )
    ctx["project_id"] = resp.json()["data"]["id"]
    return ctx


def test_create_checkpoint_as_ceo(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["ceo_token"]),
        json={"decision": "continue", "notes": "Looking good"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["decision"] == "continue"
    assert data["created_by"] == setup["ceo_id"]


def test_create_checkpoint_as_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["member_token"]),
        json={"decision": "kill", "notes": "..."},
    )
    assert resp.status_code == 403


def test_create_checkpoint_unknown_project_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/checkpoints",
        headers=_bearer(setup["ceo_token"]),
        json={"decision": "continue"},
    )
    assert resp.status_code == 404


def test_list_checkpoints_as_ceo(setup: dict, client: TestClient) -> None:
    client.post(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["ceo_token"]),
        json={"decision": "continue", "notes": "n1"},
    )
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    assert len(resp.json()["data"]) >= 1


def test_list_checkpoints_as_member_forbidden(setup: dict, client: TestClient) -> None:
    """List endpoint is CEO-only per spec."""
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/checkpoints",
        headers=_bearer(setup["member_token"]),
    )
    assert resp.status_code == 403


def test_list_checkpoints_unknown_project_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/checkpoints",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404
