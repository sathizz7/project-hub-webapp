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


# ---------------------------------------------------------------------------
# pending_reviews
# ---------------------------------------------------------------------------

def _seed_submission(client: TestClient, ctx: dict, title: str = "Sub1") -> str:
    """Create a submission by the team member and return its id.

    The submissions POST returns 200 (not 201) — the router uses ok() without
    an explicit status_code override.
    """
    resp = client.post(
        "/api/v1/submissions",
        headers=_bearer(ctx["mem_token"]),
        json={
            "title": title,
            "type": "document",
            "project_id": ctx["project_id"],
        },
    )
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]["id"]


def test_inbox_includes_pending_reviews(setup: dict, client: TestClient) -> None:
    """A submission with no CEO feedback appears in pending_reviews."""
    sub_id = _seed_submission(client, setup)
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    reviews = data["pending_reviews"]
    assert len(reviews) == 1
    r = reviews[0]
    assert r["id"] == sub_id
    assert r["title"] == "Sub1"
    # project shape
    assert r["project"]["id"] == setup["project_id"]
    assert isinstance(r["project"]["title"], str)
    # submitter shape
    assert r["submitter"]["id"] == setup["mem_id"]
    assert isinstance(r["submitter"]["name"], str)
    assert isinstance(r["submitter"]["avatar_color"], str)
    assert "created_at" in r


def test_inbox_excludes_reviews_already_feedbacked_by_ceo(
    setup: dict, client: TestClient
) -> None:
    """A submission that the CEO already gave feedback on is NOT in pending_reviews."""
    sub_id = _seed_submission(client, setup)
    # CEO provides feedback via the nested submissions feedback route
    fb = client.post(
        f"/api/v1/submissions/{sub_id}/feedback",
        headers=_bearer(setup["ceo_token"]),
        json={"text": "LGTM"},
    )
    assert fb.status_code == 200, fb.text
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["pending_reviews"] == []


# ---------------------------------------------------------------------------
# pending_captures  (seeded directly in DB — no public API for bare session/item creation)
# ---------------------------------------------------------------------------

def _db_seed_capture_session(user_id: str, raw_input: str = "capture input") -> str:
    """Insert a capture session directly and return its id (str)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO capture_sessions (user_id, raw_input) VALUES (%s, %s) RETURNING id",
                (user_id, raw_input),
            )
            row = cur.fetchone()
            assert row is not None
        conn.commit()
    return str(row["id"])


def _db_seed_capture_item(
    session_id: str,
    title: str = "CaptureItem1",
    item_type: str = "todo",
    priority: str = "medium",
    status: str = "pending",
) -> str:
    """Insert a capture item directly and return its id (str)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO capture_items (session_id, type, title, priority, status)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id
                """,
                (session_id, item_type, title, priority, status),
            )
            row = cur.fetchone()
            assert row is not None
        conn.commit()
    return str(row["id"])


def test_inbox_includes_pending_captures_for_calling_ceo(
    setup: dict, client: TestClient
) -> None:
    """Pending capture items from the CEO's own sessions appear in pending_captures."""
    sess_id = _db_seed_capture_session(setup["ceo_id"])
    item_id = _db_seed_capture_item(sess_id, title="MyCaptureItem")
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    captures = data["pending_captures"]
    assert len(captures) == 1
    c = captures[0]
    assert c["id"] == item_id
    assert c["title"] == "MyCaptureItem"
    assert "item_type" in c
    assert "priority" in c
    assert "created_at" in c


def test_inbox_excludes_pending_captures_from_other_users(
    setup: dict, client: TestClient
) -> None:
    """Pending capture items from another user's sessions do NOT appear for the CEO."""
    sess_id = _db_seed_capture_session(setup["mem_id"], "member session")
    _db_seed_capture_item(sess_id, title="MemberItem")
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    # The member's items must not bleed into the CEO's inbox
    assert data["pending_captures"] == []


def test_inbox_excludes_dismissed_or_converted_captures(
    setup: dict, client: TestClient
) -> None:
    """Capture items with status dismissed or converted are not in pending_captures."""
    sess_id = _db_seed_capture_session(setup["ceo_id"])
    _db_seed_capture_item(sess_id, title="Dismissed", status="dismissed")
    _db_seed_capture_item(sess_id, title="Converted", status="converted")
    resp = client.get("/api/v1/inbox", headers=_bearer(setup["ceo_token"]))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["pending_captures"] == []
