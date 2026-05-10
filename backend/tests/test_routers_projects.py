"""Integration tests for /api/v1/projects."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def setup_users(client: TestClient, db_clean: None) -> dict:
    """Seed CEO + team member, return ids and tokens for both.

    `client` is listed first so the FastAPI lifespan (which calls init_pool)
    is active before db_clean tries to use get_conn directly.
    """
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('CEO', 'ceo@x.com', 'Founder', 'ceo', '#000', %s),
                       ('Member', 'mem@x.com', 'Engineer', 'team_member', '#FFF', %s)
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
    }


@pytest.fixture
def setup_with_project(setup_users: dict, client: TestClient) -> dict:
    """Create one project (engineering, with the member as an assignee) via the API."""
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={
            "title": "Test Project",
            "type": "engineering",
            "requirement": "Test requirement",
            "priority": "high",
            "timebox_days": 30,
            "assignee_ids": [setup_users["member_id"]],
        },
    )
    assert resp.status_code == 200, resp.text
    project = resp.json()["data"]
    return {**setup_users, "project_id": project["id"]}


# ----- GET /projects -----

def test_list_projects_returns_seeded(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/projects", headers=_bearer(setup_with_project["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert any(p["id"] == setup_with_project["project_id"] for p in data)


def test_list_projects_includes_assignees(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/projects", headers=_bearer(setup_with_project["ceo_token"]))
    project = next(p for p in resp.json()["data"] if p["id"] == setup_with_project["project_id"])
    assignee_ids = {a["id"] for a in project["assignees"]}
    assert setup_with_project["member_id"] in assignee_ids
    assert setup_with_project["ceo_id"] in assignee_ids   # creator auto-added


def test_list_projects_progress_field_present(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get("/api/v1/projects", headers=_bearer(setup_with_project["ceo_token"]))
    p = next(p for p in resp.json()["data"] if p["id"] == setup_with_project["project_id"])
    assert "progress" in p
    assert isinstance(p["progress"], int)
    assert 0 <= p["progress"] <= 100


def test_list_projects_unauth(client: TestClient, db_clean: None) -> None:
    assert client.get("/api/v1/projects").status_code == 401


def test_list_projects_member_only_sees_own(setup_with_project: dict, client: TestClient) -> None:
    """Member listing /projects only sees projects they are assigned to."""
    # CEO creates a SECOND project the member is NOT on
    client.post(
        "/api/v1/projects",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"title": "Other", "type": "research", "priority": "low"},
    )
    resp = client.get("/api/v1/projects", headers=_bearer(setup_with_project["member_token"]))
    titles = [p["title"] for p in resp.json()["data"]]
    assert "Test Project" in titles
    assert "Other" not in titles


# ----- POST /projects -----

def test_create_project_as_ceo(setup_users: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={
            "title": "New Project",
            "type": "research",
            "requirement": "Test",
            "priority": "medium",
            "timebox_days": 60,
        },
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["title"] == "New Project"
    assert data["type"] == "research"
    # Auto-creates phases
    assert len(data["phases"]) > 0


def test_create_project_auto_assigns_creator(setup_users: dict, client: TestClient) -> None:
    """The creator is automatically added to project_assignees."""
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={"title": "P1", "type": "engineering", "priority": "low"},
    )
    project = resp.json()["data"]
    assignee_ids = {a["user"]["id"] for a in project["assignees"]}
    assert setup_users["ceo_id"] in assignee_ids


def test_create_project_as_member_forbidden(setup_users: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["member_token"]),
        json={"title": "Sneaky", "type": "engineering", "priority": "low"},
    )
    assert resp.status_code == 403


# ----- GET /projects/{id} (hydrated) -----

def test_get_project_hydrated_as_ceo(setup_with_project: dict, client: TestClient) -> None:
    resp = client.get(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["ceo_token"]),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["id"] == setup_with_project["project_id"]
    assert isinstance(data["assignees"], list)
    assert isinstance(data["phases"], list)
    assert isinstance(data["tasks"], list)
    assert isinstance(data["submissions"], list)
    assert isinstance(data["checkpoints"], list)


def test_get_project_hydrated_as_assigned_member(
    setup_with_project: dict, client: TestClient
) -> None:
    resp = client.get(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["member_token"]),
    )
    assert resp.status_code == 200


def test_get_project_unassigned_member_returns_404(
    setup_users: dict, client: TestClient
) -> None:
    """A member NOT assigned to a project must get 404 — don't leak existence."""
    # CEO creates project without assigning the member
    resp = client.post(
        "/api/v1/projects",
        headers=_bearer(setup_users["ceo_token"]),
        json={"title": "Secret", "type": "engineering", "priority": "low"},
    )
    pid = resp.json()["data"]["id"]
    # Member tries to fetch it
    resp = client.get(f"/api/v1/projects/{pid}", headers=_bearer(setup_users["member_token"]))
    assert resp.status_code == 404


def test_get_project_unknown_returns_404(setup_users: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup_users["ceo_token"]),
    )
    assert resp.status_code == 404


# ----- PATCH /projects/{id} -----

def test_patch_project_as_ceo(setup_with_project: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"title": "Renamed"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["title"] == "Renamed"


def test_patch_project_as_member_forbidden(setup_with_project: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/projects/{setup_with_project['project_id']}",
        headers=_bearer(setup_with_project["member_token"]),
        json={"title": "Hijacked"},
    )
    assert resp.status_code == 403


# ----- POST /projects/{id}/assignees -----

def test_add_assignees(setup_with_project: dict, client: TestClient) -> None:
    """Add a new assignee to an existing project."""
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Third', 'third@x.com', 'X', 'team_member', '#000', %s)
                RETURNING id
                """,
                (pw,),
            )
            third_id = str(cur.fetchone()["id"])
        conn.commit()
    resp = client.post(
        f"/api/v1/projects/{setup_with_project['project_id']}/assignees",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"user_ids": [third_id]},
    )
    assert resp.status_code == 200
    ids = {a["user"]["id"] for a in resp.json()["data"]["assignees"]}
    assert third_id in ids


def test_add_assignees_idempotent(setup_with_project: dict, client: TestClient) -> None:
    """Adding the same assignee twice doesn't error (ON CONFLICT DO NOTHING)."""
    resp = client.post(
        f"/api/v1/projects/{setup_with_project['project_id']}/assignees",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"user_ids": [setup_with_project["member_id"]]},
    )
    assert resp.status_code == 200


# ----- DELETE /projects/{id}/assignees/{user_id} -----

def test_remove_assignee(setup_with_project: dict, client: TestClient) -> None:
    resp = client.delete(
        f"/api/v1/projects/{setup_with_project['project_id']}/assignees/{setup_with_project['member_id']}",
        headers=_bearer(setup_with_project["ceo_token"]),
    )
    assert resp.status_code == 200
    ids = {a["user"]["id"] for a in resp.json()["data"]["assignees"]}
    assert setup_with_project["member_id"] not in ids


# ----- GET /my/projects -----

def test_my_projects_returns_only_assigned(setup_with_project: dict, client: TestClient) -> None:
    """The member sees only projects they're assigned to."""
    client.post(
        "/api/v1/projects",
        headers=_bearer(setup_with_project["ceo_token"]),
        json={"title": "Other", "type": "research", "priority": "low"},
    )
    resp = client.get(
        "/api/v1/my/projects", headers=_bearer(setup_with_project["member_token"])
    )
    assert resp.status_code == 200
    titles = [p["title"] for p in resp.json()["data"]]
    assert "Test Project" in titles
    assert "Other" not in titles
