"""Deadline-extensions router — list/get/create/approve."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.extensions import ExtensionCreate, ExtensionUpdate


router = APIRouter(prefix="/api/v1/deadline-extensions", tags=["deadline-extensions"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _shape_extension(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "task_id": str(r["task_id"]) if r["task_id"] else None,
        "requested_by_id": str(r["requested_by_id"]),
        "original_deadline": r["original_deadline"].isoformat() if r["original_deadline"] else None,
        "requested_deadline": r["requested_deadline"].isoformat() if r["requested_deadline"] else None,
        "reason": r["reason"],
        "status": r["status"],
        "ceo_comment": r["ceo_comment"],
        "approved_by_id": str(r["approved_by_id"]) if r["approved_by_id"] else None,
        "escalation_level": r["escalation_level"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


@router.get("")
def list_extensions(
    status_filter: Optional[str] = Query(None, alias="status"),
    project_id: Optional[UUID] = Query(None),
    task_id: Optional[UUID] = Query(None),
    requested_by_id: Optional[UUID] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    where_clauses = []
    params: list = []
    if status_filter is not None:
        where_clauses.append("status = %s")
        params.append(status_filter)
    if project_id is not None:
        where_clauses.append("project_id = %s")
        params.append(str(project_id))
    if task_id is not None:
        where_clauses.append("task_id = %s")
        params.append(str(task_id))
    if requested_by_id is not None:
        where_clauses.append("requested_by_id = %s")
        params.append(str(requested_by_id))
    if user.role_type != "ceo":
        where_clauses.append("requested_by_id = %s")
        params.append(user.user_id)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, project_id, task_id, requested_by_id, original_deadline,
               requested_deadline, reason, status, ceo_comment, approved_by_id,
               escalation_level, created_at, updated_at
        FROM deadline_extensions
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
    return ok(data=[_shape_extension(r) for r in rows])


@router.get("/{ext_id}")
def get_extension(ext_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, task_id, requested_by_id, original_deadline,
                       requested_deadline, reason, status, ceo_comment, approved_by_id,
                       escalation_level, created_at, updated_at
                FROM deadline_extensions WHERE id = %s
                """,
                (str(ext_id),),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Extension not found")
    if user.role_type != "ceo" and str(row["requested_by_id"]) != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Extension not found")
    return ok(data=_shape_extension(row))


@router.post("")
def create_extension(
    payload: ExtensionCreate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if payload.project_id is not None:
                if not _user_can_see_project(cur, payload.project_id, user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO deadline_extensions
                  (project_id, task_id, requested_by_id, original_deadline,
                   requested_deadline, reason, status, escalation_level)
                VALUES (%(project_id)s, %(task_id)s, %(requested_by_id)s,
                        %(original_deadline)s, %(requested_deadline)s, %(reason)s,
                        'pending', 0)
                RETURNING id, project_id, task_id, requested_by_id, original_deadline,
                          requested_deadline, reason, status, ceo_comment, approved_by_id,
                          escalation_level, created_at, updated_at
                """,
                {
                    "project_id": payload.project_id,
                    "task_id": payload.task_id,
                    "requested_by_id": user.user_id,
                    "original_deadline": payload.original_deadline,
                    "requested_deadline": payload.requested_deadline,
                    "reason": payload.reason,
                },
            )
            row = cur.fetchone()
            assert row is not None
        conn.commit()
    return ok(data=_shape_extension(row), message="Created")


@router.patch("/{ext_id}", dependencies=[Depends(require_roles("ceo"))])
def update_extension(
    ext_id: UUID,
    payload: ExtensionUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    set_pairs = [f"{k} = %({k})s" for k in fields]
    params: dict = {**fields, "__id": str(ext_id), "__approver": user.user_id}
    if "status" in fields:
        set_pairs.append("approved_by_id = %(__approver)s")

    sql = (
        f"UPDATE deadline_extensions SET {', '.join(set_pairs)}, updated_at = now() "
        f"WHERE id = %(__id)s "
        f"RETURNING id, project_id, task_id, requested_by_id, original_deadline, "
        f"          requested_deadline, reason, status, ceo_comment, approved_by_id, "
        f"          escalation_level, created_at, updated_at"
    )
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Extension not found")
    return ok(data=_shape_extension(row))
