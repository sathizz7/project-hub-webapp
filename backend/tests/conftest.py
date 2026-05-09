"""Shared pytest fixtures for backend tests.

- `client` provides a FastAPI TestClient with the full app + lifespan.
- `db_clean` truncates all tables between tests that need a clean DB.

These fixtures connect to the dev Postgres (`projecthub` DB) on the
assumption that the migration has already been applied. Tests that
mutate data should use `db_clean` to reset state.
"""

import pytest
from fastapi.testclient import TestClient

from app.db import close_pool, get_conn, init_pool
from app.main import app


@pytest.fixture(scope="session", autouse=True)
def _pool_lifecycle():
    """Open the connection pool once per test session."""
    init_pool()
    yield
    close_pool()


@pytest.fixture
def client():
    """FastAPI TestClient for the full application (lifespan active)."""
    with TestClient(app) as c:
        yield c


# Reverse-dependency order so foreign keys don't block truncation
_TABLES_TO_CLEAN = [
    "capture_item_assignees",
    "capture_items",
    "capture_sessions",
    "deadline_extensions",
    "leave_requests",
    "checkpoints",
    "feedback",
    "submissions",
    "tasks",
    "phases",
    "project_assignees",
    "projects",
    "users",
]


@pytest.fixture
def db_clean() -> None:
    """Truncate all data tables. Use on tests that mutate state."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(f"TRUNCATE {', '.join(_TABLES_TO_CLEAN)} RESTART IDENTITY CASCADE;")
        conn.commit()
