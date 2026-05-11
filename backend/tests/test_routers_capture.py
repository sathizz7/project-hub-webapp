"""Integration tests for /api/v1/capture."""

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
        "ceo_id": by_role["ceo"],
        "mem_id": by_role["team_member"],
        "ceo_token": issue_access_token(by_role["ceo"], "ceo"),
        "mem_token": issue_access_token(by_role["team_member"], "team_member"),
    }


@patch("app.routers.capture.call_llm")
def test_process_creates_session_with_items(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '[{"type":"todo","title":"Write docs","description":"x","priority":"high"}]'
    resp = client.post(
        "/api/v1/capture/process",
        headers=_bearer(setup["ceo_token"]),
        json={"raw_input": "Need to write the API docs"},
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["user_id"] == setup["ceo_id"]
    assert len(data["items"]) == 1
    assert data["items"][0]["title"] == "Write docs"


@patch("app.routers.capture.call_llm")
def test_process_empty_items_on_llm_failure(mock_llm, setup: dict, client: TestClient) -> None:
    """If the LLM returns non-JSON, the session is created with an empty items array."""
    mock_llm.return_value = "Sorry, I can't process that"
    resp = client.post(
        "/api/v1/capture/process",
        headers=_bearer(setup["ceo_token"]),
        json={"raw_input": "anything"},
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["items"] == []


@patch("app.routers.capture.call_llm")
def test_list_sessions_returns_own_only(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = "[]"
    client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                json={"raw_input": "ceo session"})
    client.post("/api/v1/capture/process", headers=_bearer(setup["mem_token"]),
                json={"raw_input": "mem session"})

    resp = client.get("/api/v1/capture/sessions", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 200
    sessions = resp.json()["data"]
    assert all(s["user_id"] == setup["mem_id"] for s in sessions)


@patch("app.routers.capture.call_llm")
def test_get_session_other_user_returns_404(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = "[]"
    create = client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                         json={"raw_input": "ceo session"})
    sid = create.json()["data"]["id"]
    resp = client.get(f"/api/v1/capture/sessions/{sid}", headers=_bearer(setup["mem_token"]))
    assert resp.status_code == 404


@patch("app.routers.capture.call_llm")
def test_patch_item_status(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '[{"type":"todo","title":"X","description":"","priority":"low"}]'
    create = client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                         json={"raw_input": "x"})
    item_id = create.json()["data"]["items"][0]["id"]
    resp = client.patch(f"/api/v1/capture/items/{item_id}",
                        headers=_bearer(setup["ceo_token"]),
                        json={"status": "dismissed"})
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "dismissed"


@patch("app.routers.capture.call_llm")
def test_patch_item_other_user_returns_404(mock_llm, setup: dict, client: TestClient) -> None:
    mock_llm.return_value = '[{"type":"todo","title":"X","description":"","priority":"low"}]'
    create = client.post("/api/v1/capture/process", headers=_bearer(setup["ceo_token"]),
                         json={"raw_input": "x"})
    item_id = create.json()["data"]["items"][0]["id"]
    resp = client.patch(f"/api/v1/capture/items/{item_id}",
                        headers=_bearer(setup["mem_token"]),
                        json={"status": "dismissed"})
    assert resp.status_code == 404


def test_process_unauth(client: TestClient, db_clean: None) -> None:
    assert client.post("/api/v1/capture/process", json={"raw_input": "x"}).status_code == 401
