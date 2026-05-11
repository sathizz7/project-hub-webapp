"""Leaves router — list/get/create/approve."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.leaves import LeaveCreate, LeaveUpdate


router = APIRouter(prefix="/api/v1/leaves", tags=["leaves"])


def _shape_leave(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "user_id": str(r["user_id"]),
        "type": r["type"],
        "start_date": r["start_date"].isoformat() if r["start_date"] else None,
        "end_date": r["end_date"].isoformat() if r["end_date"] else None,
        "days": float(r["days"]) if r["days"] is not None else None,
        "reason": r["reason"],
        "status": r["status"],
        "approved_by_id": str(r["approved_by_id"]) if r["approved_by_id"] else None,
        "cover_person_id": str(r["cover_person_id"]) if r["cover_person_id"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


@router.get("")
def list_leaves(
    status_filter: Optional[str] = Query(None, alias="status"),
    user_id: Optional[UUID] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    where_clauses = []
    params: list = []
    if status_filter is not None:
        where_clauses.append("status = %s")
        params.append(status_filter)
    if user_id is not None:
        where_clauses.append("user_id = %s")
        params.append(str(user_id))
    if user.role_type != "ceo":
        where_clauses.append("user_id = %s")
        params.append(user.user_id)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, user_id, type, start_date, end_date, days, reason, status,
               approved_by_id, cover_person_id, created_at, updated_at
        FROM leave_requests
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
    return ok(data=[_shape_leave(r) for r in rows])


@router.get("/{leave_id}")
def get_leave(leave_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, type, start_date, end_date, days, reason, status,
                       approved_by_id, cover_person_id, created_at, updated_at
                FROM leave_requests WHERE id = %s
                """,
                (str(leave_id),),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Leave not found")
    if user.role_type != "ceo" and str(row["user_id"]) != user.user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Leave not found")
    return ok(data=_shape_leave(row))


@router.post("")
def create_leave(payload: LeaveCreate, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO leave_requests (user_id, type, start_date, end_date, days,
                                            reason, status, cover_person_id)
                VALUES (%(user_id)s, %(type)s, %(start_date)s, %(end_date)s, %(days)s,
                        %(reason)s, 'pending', %(cover_person_id)s)
                RETURNING id, user_id, type, start_date, end_date, days, reason, status,
                          approved_by_id, cover_person_id, created_at, updated_at
                """,
                {
                    "user_id": user.user_id,
                    "type": payload.type,
                    "start_date": payload.start_date,
                    "end_date": payload.end_date,
                    "days": payload.days,
                    "reason": payload.reason,
                    "cover_person_id": payload.cover_person_id,
                },
            )
            row = cur.fetchone()
            assert row is not None
        conn.commit()
    return ok(data=_shape_leave(row), message="Created")


@router.patch("/{leave_id}", dependencies=[Depends(require_roles("ceo"))])
def update_leave(
    leave_id: UUID,
    payload: LeaveUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    set_pairs = [f"{k} = %({k})s" for k in fields]
    params: dict = {**fields, "__id": str(leave_id), "__approver": user.user_id}
    if "status" in fields:
        set_pairs.append("approved_by_id = %(__approver)s")

    sql = (
        f"UPDATE leave_requests SET {', '.join(set_pairs)}, updated_at = now() "
        f"WHERE id = %(__id)s "
        f"RETURNING id, user_id, type, start_date, end_date, days, reason, status, "
        f"          approved_by_id, cover_person_id, created_at, updated_at"
    )
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, params)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Leave not found")
    return ok(data=_shape_leave(row))
