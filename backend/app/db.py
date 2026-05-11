"""Postgres connection pool + per-request connection helper."""

from contextlib import contextmanager
from typing import Any, Generator

from psycopg import Connection
from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

from app.config import settings

# Row type for cursors derived from this pool's connections.
# Set via the dict_row factory in init_pool() — every cursor returns dicts,
# not tuples. Parameterizing Connection with this row type makes mypy aware.
DictRow = dict[str, Any]

_pool: ConnectionPool[Connection[DictRow]] | None = None


def init_pool() -> None:
    """Open the global connection pool. Idempotent."""
    global _pool
    if _pool is None:
        _pool = ConnectionPool(
            conninfo=settings.db_url,
            min_size=1,
            max_size=10,
            kwargs={"row_factory": dict_row},
            open=True,
        )
        _pool.wait()


def close_pool() -> None:
    """Close the global pool. Idempotent."""
    global _pool
    if _pool is not None:
        _pool.close()
        _pool = None


@contextmanager
def get_conn() -> Generator[Connection[DictRow], None, None]:
    """Check out a connection from the pool for the duration of the context.

    Usage:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute("SELECT ...")
                rows = cur.fetchall()    # list[dict[str, Any]]
                row = cur.fetchone()     # dict[str, Any] | None
    """
    if _pool is None:
        raise RuntimeError("Connection pool not initialized — call init_pool() at app startup")
    with _pool.connection() as conn:
        yield conn
