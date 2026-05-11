"""Integration tests for /api/v1/projects/{id}/phases + /api/v1/phases/{id}."""

import pytest
from fastapi.testclient import TestClient

from app.auth import hash_password, issue_access_token
from app.db import get_conn


def _bearer(t: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {t}"}


@pytest.fixture
def setup(client: TestClient, db_clean: None) -> dict:
    """Seed CEO + member, then create one project with the member assigned.

    Note: `client` is listed before `db_clean` so the FastAPI lifespan
    (which calls init_pool) runs before any direct get_conn() use.
    """
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
    assert resp.status_code == 200, resp.text
    project = resp.json()["data"]
    ctx["project_id"] = project["id"]
    ctx["first_phase_id"] = project["phases"][0]["id"]
    return ctx


# ----- GET /projects/{id}/phases -----

def test_list_phases_for_project(setup: dict, client: TestClient) -> None:
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/phases",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 200
    phases = resp.json()["data"]
    assert isinstance(phases, list)
    assert len(phases) > 0
    # Ordering by "order" preserved
    orders = [p["order"] for p in phases]
    assert orders == sorted(orders)


def test_list_phases_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/phases",
        headers=_bearer(setup["member_token"]),
    )
    assert resp.status_code == 200


def test_list_phases_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
    """A member who isn't on the project must NOT see its phases (404 not 403)."""
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
    resp = client.get(
        f"/api/v1/projects/{setup['project_id']}/phases",
        headers=_bearer(other_token),
    )
    assert resp.status_code == 404


def test_list_phases_unknown_project_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.get(
        "/api/v1/projects/00000000-0000-0000-0000-000000000000/phases",
        headers=_bearer(setup["ceo_token"]),
    )
    assert resp.status_code == 404


# ----- PATCH /phases/{id} -----

def test_patch_phase_checklist_as_assigned_member(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/phases/{setup['first_phase_id']}",
        headers=_bearer(setup["member_token"]),
        json={"checklist": [{"label": "step", "done": True}]},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["checklist"] == [{"label": "step", "done": True}]


def test_patch_phase_status_as_ceo(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/phases/{setup['first_phase_id']}",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "active"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "active"


def test_patch_phase_unassigned_member_returns_404(setup: dict, client: TestClient) -> None:
    """A member not on the project gets 404 — don't leak existence."""
    pw = hash_password("dev")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                VALUES ('Other2', 'o2@x.com', 'X', 'team_member', '#000', %s)
                RETURNING id
                """,
                (pw,),
            )
            other_id = str(cur.fetchone()["id"])
        conn.commit()
    other_token = issue_access_token(other_id, "team_member")
    resp = client.patch(
        f"/api/v1/phases/{setup['first_phase_id']}",
        headers=_bearer(other_token),
        json={"status": "active"},
    )
    assert resp.status_code == 404


def test_patch_phase_unknown_returns_404(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        "/api/v1/phases/00000000-0000-0000-0000-000000000000",
        headers=_bearer(setup["ceo_token"]),
        json={"status": "active"},
    )
    assert resp.status_code == 404


def test_patch_phase_empty_body_returns_400(setup: dict, client: TestClient) -> None:
    resp = client.patch(
        f"/api/v1/phases/{setup['first_phase_id']}",
        headers=_bearer(setup["ceo_token"]),
        json={},
    )
    assert resp.status_code == 400
