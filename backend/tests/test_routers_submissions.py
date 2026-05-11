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


def test_list_submissions_with_include_feedback_returns_nested(
    setup: dict, client: TestClient
) -> None:
    """?include=feedback embeds a feedback array on each submission."""
    # Create a submission
    create_resp = client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "Sub1", "type": "code"},
    )
    assert create_resp.status_code == 200, create_resp.text
    sid = create_resp.json()["data"]["id"]

    # Add 2 feedback rows
    for text in ("First feedback", "Second feedback"):
        fb_resp = client.post(
            f"/api/v1/submissions/{sid}/feedback",
            headers=_bearer(setup["ceo_token"]),
            json={"text": text, "is_ai": False},
        )
        assert fb_resp.status_code == 200, fb_resp.text

    resp = client.get(
        f"/api/v1/submissions?include=feedback",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert len(data) >= 1
    sub = next(s for s in data if s["id"] == sid)
    assert "feedback" in sub
    assert len(sub["feedback"]) == 2
    for fb in sub["feedback"]:
        assert "text" in fb
        assert "is_ai" in fb
        assert "created_at" in fb
        assert "from_user_id" in fb


def test_list_submissions_without_include_does_not_return_feedback(
    setup: dict, client: TestClient
) -> None:
    """Without ?include=feedback the feedback key must be absent."""
    create_resp = client.post(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
        json={"project_id": setup["project_id"], "title": "Sub2", "type": "document"},
    )
    assert create_resp.status_code == 200, create_resp.text
    sid = create_resp.json()["data"]["id"]

    client.post(
        f"/api/v1/submissions/{sid}/feedback",
        headers=_bearer(setup["ceo_token"]),
        json={"text": "Some feedback", "is_ai": True},
    )

    resp = client.get(
        "/api/v1/submissions",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200, resp.text
    for item in resp.json()["data"]:
        assert "feedback" not in item


def test_list_submissions_include_feedback_no_n_plus_1(
    setup: dict, client: TestClient
) -> None:
    """All 3 submissions come back with nested feedback via the batched code path."""
    sub_ids = []
    for i in range(3):
        r = client.post(
            "/api/v1/submissions",
            headers=_bearer(setup["ceo_token"]),
            json={"project_id": setup["project_id"], "title": f"SubN{i}", "type": "code"},
        )
        assert r.status_code == 200, r.text
        sub_ids.append(r.json()["data"]["id"])

    for sid in sub_ids:
        client.post(
            f"/api/v1/submissions/{sid}/feedback",
            headers=_bearer(setup["ceo_token"]),
            json={"text": f"fb for {sid}", "is_ai": False},
        )

    resp = client.get(
        "/api/v1/submissions?include=feedback",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    returned_ids = {s["id"] for s in data}
    for sid in sub_ids:
        assert sid in returned_ids
        sub = next(s for s in data if s["id"] == sid)
        assert "feedback" in sub
        assert len(sub["feedback"]) == 1
        assert sub["feedback"][0]["text"] == f"fb for {sid}"
