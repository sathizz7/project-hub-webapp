"""Phases router — list per project + update checklist/status."""

from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.phases import PhaseUpdate


router = APIRouter(tags=["phases"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    """CEO sees all. Team member must be in project_assignees."""
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _shape_phase_row(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]),
        "phase_name": r["phase_name"],
        "status": r["status"],
        "checklist": r["checklist"] if r["checklist"] is not None else [],
        "order": r["order"],
    }


@router.get("/api/v1/projects/{project_id}/phases")
def list_phases(project_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            if not _user_can_see_project(cur, pid, user):
                # Don't leak existence
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                '''SELECT id, project_id, phase_name, status, checklist, "order"
                   FROM phases WHERE project_id = %s ORDER BY "order"''',
                (pid,),
            )
            rows = cur.fetchall()
    return ok(data=[_shape_phase_row(r) for r in rows])


@router.patch("/api/v1/phases/{phase_id}")
def update_phase(
    phase_id: UUID,
    payload: PhaseUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT id, project_id FROM phases WHERE id = %s", (str(phase_id),))
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase not found")
            if not _user_can_see_project(cur, str(row["project_id"]), user):
                # Don't leak existence
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Phase not found")

            set_pairs = []
            params: dict = {"__id": str(phase_id)}
            if "checklist" in fields:
                set_pairs.append("checklist = %(checklist)s")
                params["checklist"] = psycopg.types.json.Json(
                    [item if isinstance(item, dict) else item.model_dump() for item in fields["checklist"]]
                )
            if "status" in fields:
                set_pairs.append("status = %(status)s")
                params["status"] = fields["status"]
            sql = f'''UPDATE phases SET {", ".join(set_pairs)}, updated_at = now()
                      WHERE id = %(__id)s
                      RETURNING id, project_id, phase_name, status, checklist, "order"'''
            cur.execute(sql, params)
            updated = cur.fetchone()
        conn.commit()

    return ok(data=_shape_phase_row(updated))
