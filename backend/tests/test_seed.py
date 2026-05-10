"""Tests for scripts.seed — idempotent seed script."""

import pytest

from app.db import get_conn, init_pool
from scripts.seed import seed


@pytest.fixture(scope="module", autouse=True)
def _ensure_pool() -> None:
    """Re-initialise the pool if a previous test module's client lifespan closed it."""
    init_pool()


def test_seed_creates_users_and_projects(db_clean: None) -> None:
    """Seed populates users + projects when DB is empty."""
    seed()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users")
            user_count = cur.fetchone()["c"]
            cur.execute("SELECT count(*) AS c FROM projects")
            project_count = cur.fetchone()["c"]

    assert user_count == 5  # 1 ceo + 4 team members
    assert project_count == 2


def test_seed_is_idempotent(db_clean: None) -> None:
    """Running seed twice produces the same row counts (no duplicates)."""
    seed()
    seed()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users")
            user_count = cur.fetchone()["c"]
            cur.execute("SELECT count(*) AS c FROM projects")
            project_count = cur.fetchone()["c"]

    assert user_count == 5
    assert project_count == 2


def test_seed_creates_a_ceo(db_clean: None) -> None:
    """At least one seeded user has role_type='ceo'."""
    seed()
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users WHERE role_type = 'ceo'")
            ceo_count = cur.fetchone()["c"]

    assert ceo_count == 1
