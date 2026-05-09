"""Verify the migrated schema matches the spec.

Runs against the live Postgres after `alembic upgrade head`.
"""

import pytest

from app.db import get_conn, init_pool


@pytest.fixture(scope="module", autouse=True)
def _ensure_pool():
    """Ensure the pool is open for this test module's queries."""
    init_pool()
    yield


_EXPECTED_TABLES = {
    "users",
    "projects",
    "project_assignees",
    "phases",
    "tasks",
    "submissions",
    "feedback",
    "checkpoints",
    "leave_requests",
    "deadline_extensions",
    "capture_sessions",
    "capture_items",
    "capture_item_assignees",
}


def test_all_expected_tables_exist() -> None:
    """All 13 user-data tables from the spec exist in public schema."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                  AND table_type = 'BASE TABLE'
                  AND table_name != 'alembic_version'
                """
            )
            actual = {row["table_name"] for row in cur.fetchall()}
    missing = _EXPECTED_TABLES - actual
    extra = actual - _EXPECTED_TABLES
    assert not missing, f"Missing tables: {missing}"
    assert not extra, f"Unexpected tables: {extra}"


def test_users_has_unique_email() -> None:
    """users.email has a UNIQUE constraint (per spec)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT count(*) AS c
                FROM information_schema.table_constraints
                WHERE table_name = 'users'
                  AND constraint_type = 'UNIQUE'
                """
            )
            row = cur.fetchone()
    assert row is not None and row["c"] >= 1


def test_pgcrypto_extension_enabled() -> None:
    """pgcrypto must be installed for gen_random_uuid()."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT extname FROM pg_extension WHERE extname = 'pgcrypto'")
            row = cur.fetchone()
    assert row is not None
    assert row["extname"] == "pgcrypto"


def test_indexes_exist() -> None:
    """Six indexes from the spec exist."""
    expected = {
        "idx_projects_status_created",
        "idx_tasks_assignee_status",
        "idx_tasks_project_phase",
        "idx_submissions_project_created",
        "idx_leave_requests_user_status",
        "idx_capture_sessions_user_created",
    }
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT indexname FROM pg_indexes WHERE schemaname = 'public'
                """
            )
            actual = {row["indexname"] for row in cur.fetchall()}
    missing = expected - actual
    assert not missing, f"Missing indexes: {missing}"
