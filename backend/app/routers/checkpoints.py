"""Checkpoints router — nested under projects; CEO-only."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.checkpoints import CheckpointCreate


router = APIRouter(tags=["checkpoints"])


def _shape_checkpoint(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]),
        "decision": r["decision"],
        "notes": r["notes"],
        "created_by": str(r["created_by"]) if r["created_by"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


@router.get(
    "/api/v1/projects/{project_id}/checkpoints",
    dependencies=[Depends(require_roles("ceo"))],
)
def list_checkpoints(project_id: UUID) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                SELECT id, project_id, decision, notes, created_by, created_at
                FROM checkpoints WHERE project_id = %s
                ORDER BY created_at DESC
                """,
                (pid,),
            )
            rows = cur.fetchall()
    return ok(data=[_shape_checkpoint(r) for r in rows])


@router.post(
    "/api/v1/projects/{project_id}/checkpoints",
    dependencies=[Depends(require_roles("ceo"))],
)
def create_checkpoint(
    project_id: UUID,
    payload: CheckpointCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO checkpoints (project_id, decision, notes, created_by)
                VALUES (%s, %s, %s, %s)
                RETURNING id, project_id, decision, notes, created_by, created_at
                """,
                (pid, payload.decision, payload.notes, user.user_id),
            )
            new_row = cur.fetchone()
        conn.commit()
    return ok(data=_shape_checkpoint(new_row), message="Created")
