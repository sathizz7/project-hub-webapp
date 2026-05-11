"""Integration tests for /api/v1/tasks."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
def setup(client: TestClient, db_clean: None) -> dict:
    """Seed CEO + member; create a project the member is on."""
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
    return ctx


# ----- POST /tasks -----

def test_create_task_authenticated_with_project_access(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "Do the thing",
            "description": "A test task",
            "project_id": setup["project_id"],
            "assignee_id": setup["member_id"],
            "priority": "high",
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["title"] == "Do the thing"
    assert data["status"] == "planning"
    assert data["priority"] == "high"


def test_create_task_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
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
        "/api/v1/tasks",
        headers=_bearer(other_token),
        json={"title": "Sneaky", "project_id": setup["project_id"], "priority": "low"},
    )
    assert resp.status_code == 404


def test_create_task_without_project_id_is_allowed(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Standalone", "priority": "medium"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["project_id"] is None


# ----- GET /tasks -----

def test_list_tasks_filter_by_project(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T1", "project_id": setup["project_id"], "priority": "low"},
    )
    resp = client.get(
        f"/api/v1/tasks?project_id={setup['project_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert len(data) >= 1
    assert all(t["project_id"] == setup["project_id"] for t in data)


def test_list_tasks_filter_by_assignee(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "T1", "project_id": setup["project_id"],
            "assignee_id": setup["member_id"], "priority": "low",
        },
    )
    resp = client.get(
        f"/api/v1/tasks?assignee_id={setup['member_id']}",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert all(t["assignee_id"] == setup["member_id"] for t in data)


def test_list_tasks_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/tasks").status_code == 401


def test_list_tasks_member_scoped(setup: dict, client: TestClient) -> None:
    """A member listing /tasks sees only tasks on assigned projects."""
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Other", "type": "engineering", "priority": "low"},
    )
    other_pid = resp.json()["data"]["id"]
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Secret", "project_id": other_pid, "priority": "low"},
    )
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "Visible", "project_id": setup["project_id"], "priority": "low"},
    )
    resp = client.get("/api/v1/tasks", headers=_bearer(setup["member_token"]))
    titles = [t["title"] for t in resp.json()["data"]]
    assert "Visible" in titles
    assert "Secret" not in titles


# ----- GET /tasks/{id} -----

def test_get_task_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
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
    create_resp = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create_resp.json()["data"]["id"]
    resp = client.get(f"/api/v1/tasks/{task_id}", headers=_bearer(other_token))
    assert resp.status_code == 404


def test_get_task_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/tasks/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404


# ----- PATCH /tasks/{id} -----

def test_patch_task_status_to_completed_sets_completed_at(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "completed"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["status"] == "completed"
    assert data["completed_at"] is not None


def test_patch_task_status_away_from_completed_clears_completed_at(
    setup: dict, client: TestClient
) -> None:
    create = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "completed"},
    )
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "in_progress"},
    )
    data = resp.json()["data"]
    assert data["status"] == "in_progress"
    assert data["completed_at"] is None


def test_patch_task_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
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
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(other_token),
        json={"status": "in_progress"},
    )
    assert resp.status_code == 404


def test_patch_task_empty_body_returns_400(setup: dict, client: TestClient) -> None:
    create = client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={"title": "T", "project_id": setup["project_id"], "priority": "low"},
    )
    task_id = create.json()["data"]["id"]
    resp = client.patch(
        f"/api/v1/tasks/{task_id}",
        headers=_bearer(setup["ceo_token"]),
        json={},
    )
    assert resp.status_code == 400


# ----- GET /my/tasks -----

def test_my_tasks_returns_only_assigned(setup: dict, client: TestClient) -> None:
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "Mine", "project_id": setup["project_id"],
            "assignee_id": setup["member_id"], "priority": "low",
        },
    )
    client.post(
        "/api/v1/tasks",
        headers=_bearer(setup["ceo_token"]),
        json={
            "title": "Theirs", "project_id": setup["project_id"],
            "assignee_id": setup["ceo_id"], "priority": "low",
        },
    )
    resp = client.get("/api/v1/my/tasks", headers=_bearer(setup["member_token"]))
    assert resp.status_code == 200
    titles = [t["title"] for t in resp.json()["data"]]
    assert "Mine" in titles
    assert "Theirs" not in titles
