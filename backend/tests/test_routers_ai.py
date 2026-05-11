"""Integration tests for /api/v1/ai/*."""

from unittest.mock import patch

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
    return {
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "mem_token": issue_access_token(by_role["team_member"], "team_member"),
    }


@patch("app.routers.ai.call_llm")
def test_generate_plan_returns_parsed_json(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '{"summary":"x","phases":[],"milestones":[],"kill_criteria":[],"risks":[],"tech_stack":["py"]}'
    resp = client.post(
        "/api/v1/ai/generate-plan",
        headers=_bearer(setup["ceo_token"]),
        json={"requirement": "Build a payment system", "type": "engineering"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["summary"] == "x"
    assert data["tech_stack"] == ["py"]


def test_generate_plan_team_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/ai/generate-plan",
        headers=_bearer(setup["mem_token"]),
        json={"requirement": "x", "type": "engineering"},
    )
    assert resp.status_code == 403


@patch("app.routers.ai.call_llm")
def test_review_returns_feedback(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = "This looks solid; consider adding error tests."
    resp = client.post(
        "/api/v1/ai/review",
        headers=_bearer(setup["ceo_token"]),
        json={"submission_title": "Auth doc", "submission_type": "document"},
    )
    assert resp.status_code == 200
    assert "solid" in resp.json()["data"]["feedback"]


def test_review_team_member_forbidden(setup: dict, client: TestClient) -> None:
    resp = client.post(
        "/api/v1/ai/review",
        headers=_bearer(setup["mem_token"]),
        json={"submission_title": "x", "submission_type": "document"},
    )
    assert resp.status_code == 403


@patch("app.routers.ai.call_llm")
def test_suggest_stack_returns_array(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '["TypeScript","Next.js","Postgres"]'
    resp = client.post(
        "/api/v1/ai/suggest-stack",
        headers=_bearer(setup["ceo_token"]),
        json={"description": "An internal CRM"},
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["tech_stack"] == ["TypeScript", "Next.js", "Postgres"]


def test_unauth_returns_401(client: TestClient, db_clean: None) -> None:
    resp = client.post("/api/v1/ai/generate-plan", json={"requirement": "x", "type": "engineering"})
    assert resp.status_code == 401
