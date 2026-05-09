"""Tests for app.db connection pool and helpers."""

import pytest

from app.db import close_pool, get_conn, init_pool


@pytest.fixture(scope="module", autouse=True)
def _pool_lifecycle():
    """Open the pool once for this test module, close at the end."""
    init_pool()
    yield
    close_pool()


def test_get_conn_yields_a_connection() -> None:
    """get_conn() context manager yields a working psycopg connection."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 AS one")
            row = cur.fetchone()
            assert row is not None
            assert row["one"] == 1


def test_get_conn_returns_dict_rows() -> None:
    """Cursors return rows as dicts when row_factory is configured."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 'alpha' AS name, 42 AS num")
            row = cur.fetchone()
            assert row is not None
            assert row["name"] == "alpha"
            assert row["num"] == 42


def test_get_conn_can_query_users_table() -> None:
    """Connecting to projecthub DB and selecting from the users table works (proves schema applied)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT count(*) AS c FROM users")
            row = cur.fetchone()
            assert row is not None
            assert row["c"] >= 0  # no users yet, but query should succeed
