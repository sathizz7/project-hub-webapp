"""Health check router — liveness + optional DB-deep probe."""

from fastapi import APIRouter

from app.db import get_conn
from app.responses import ok

router = APIRouter(tags=["health"])


@router.get("/healthz")
def healthz(deep: int = 0) -> dict:
    """Return 200 with `{ok: true}`. With ?deep=1, also pings the DB."""
    data: dict = {"ok": True}
    if deep:
        with get_conn() as conn, conn.cursor() as cur:
            cur.execute("SELECT 1 AS one")
            row = cur.fetchone()
            assert row is not None and row["one"] == 1
        data["db"] = "ok"
    return ok(data=data)
