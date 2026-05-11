"""Integration tests for /api/v1/submissions."""

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
    ctx["first_phase_id"] = project["phases"][0]["id"]
    return ctx


def test_create_submission_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["member_token"]),
        json={
            "project_id": setup["project_id"],
            "phase_id": setup["first_phase_id"],
            "title": "My doc",
            "type": "document",
            "link": "https://example.com/doc",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["title"] == "My doc"
    assert data["user_id"] == setup["member_id"]


def test_create_submission_unassigned_member_returns_404(
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
        "/api/v1/submissions",
        headers=_bearer(other_token),
        json={"project_id": setup["project_id"], "title": "S", "type": "code"},
    )
    assert resp.status_code == 404


def test_list_submissions_filter_by_project(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "S1", "type": "code"},
    )
    resp = client.get(
        f"/api/v1/submissions?project_id={setup['project_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(s["project_id"] == setup["project_id"] for s in data)


def test_list_submissions_member_scoped(setup: dict, client: TestClient) -> None:
    """Member listing submissions sees only assigned-project submissions."""
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Other", "type": "engineering", "priority": "low"},
    )
    other_pid = resp.json()["data"]["id"]
    client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": other_pid, "title": "Secret", "type": "document"},
    )
    client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "Visible", "type": "document"},
    )
    resp = client.get("/api/v1/submissions", headers=_bearer(setup["member_token"]))
    titles = [s["title"] for s in resp.json()["data"]]
    assert "Visible" in titles
    assert "Secret" not in titles


def test_get_submission_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
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
    create = client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "S", "type": "code"},
    )
    sid = create.json()["data"]["id"]
    resp = client.get(f"/api/v1/submissions/{sid}", headers=_bearer(other_token))
    assert resp.status_code == 404


def test_get_submission_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/submissions/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404


def test_list_submissions_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/submissions").status_code == 401
