"""Integration tests for /api/v1/submissions/{id}/feedback."""

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
    project = resp.json()["data"]
    ctx["project_id"] = project["id"]
    create = client.post(
        "/api/v1/submissions",
        headers=_bearer(ctx["ceo_token"]),
        json={"project_id": ctx["project_id"], "title": "S", "type": "document"},
    )
    ctx["submission_id"] = create.json()["data"]["id"]
    return ctx


def test_create_feedback_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["member_token"]),
        json={"text": "Looks good"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["text"] == "Looks good"
    assert data["from_user_id"] == setup["member_id"]
    assert data["is_ai"] is False


def test_create_feedback_ai_flag(setup: dict, client: TestClient) -> None:
    resp = client.post(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["ceo_token"]),
        json={"text": "AI says hi", "is_ai": True},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_ai"] is True


def test_create_feedback_unassigned_member_returns_404(
    setup: dict, client: TestClient
) -> None:
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
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(other_token),
        json={"text": "Sneaky"},
    )
    assert resp.status_code == 404


def test_list_feedback_for_submission(setup: dict, client: TestClient) -> None:
    client.post(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["ceo_token"]),
        json={"text": "First feedback"},
    )
    resp = client.get(
        f"/api/v1/submissions/{setup['submission_id']}/feedback",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
    assert data[0]["text"] == "First feedback"


def test_list_feedback_unknown_submission_returns_404(
    setup: dict, client: TestClient
) -> None:
    resp = client.get(
        "/api/v1/submissions/00000000-0000-0000-0000-000000000000/feedback",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404
