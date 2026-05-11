"""Inbox aggregator — CEO landing page data."""

from fastapi import APIRouter, Depends

from app.auth import require_roles
from app.db import get_conn
from app.responses import ok


router = APIRouter(prefix="/api/v1/inbox", tags=["inbox"])


def _user_summary(row: dict, prefix: str = "u_") -> dict:
    return {
        "id": str(row[f"{prefix}id"]),
        "name": row[f"{prefix}name"],
        "avatar_color": row[f"{prefix}avatar_color"],
    }


@router.get("", dependencies=[Depends(require_roles("ceo"))])
def get_inbox() -> dict:
    """Return all pending leaves + pending extensions for the CEO."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Pending leaves with requester
            cur.execute(
                """
                SELECT l.id, l.type, l.start_date, l.end_date, l.days, l.reason,
                       l.created_at,
                       u.id AS u_id, u.name AS u_name, u.avatar_color AS u_avatar_color
                FROM leave_requests l JOIN users u ON l.user_id = u.id
                WHERE l.status = 'pending'
                ORDER BY l.created_at DESC
                """
            )
            pending_leaves = []
            for r in cur.fetchall():
                pending_leaves.append({
                    "id": str(r["id"]),
                    "user": _user_summary(r),
                    "type": r["type"],
                    "start_date": r["start_date"].isoformat() if r["start_date"] else None,
                    "end_date": r["end_date"].isoformat() if r["end_date"] else None,
                    "days": float(r["days"]) if r["days"] is not None else None,
                    "reason": r["reason"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                })

            # Pending extensions with requester + project + task
            cur.execute(
                """
                SELECT e.id, e.project_id, e.task_id, e.original_deadline,
                       e.requested_deadline, e.reason, e.escalation_level, e.created_at,
                       u.id AS u_id, u.name AS u_name, u.avatar_color AS u_avatar_color,
                       p.title AS project_title,
                       t.title AS task_title
                FROM deadline_extensions e
                JOIN users u ON e.requested_by_id = u.id
                LEFT JOIN projects p ON e.project_id = p.id
                LEFT JOIN tasks t ON e.task_id = t.id
                WHERE e.status = 'pending'
                ORDER BY e.created_at DESC
                """
            )
            pending_extensions = []
            for r in cur.fetchall():
                pending_extensions.append({
                    "id": str(r["id"]),
                    "requested_by": _user_summary(r),
                    "project_id": str(r["project_id"]) if r["project_id"] else None,
                    "project_title": r["project_title"],
                    "task_id": str(r["task_id"]) if r["task_id"] else None,
                    "task_title": r["task_title"],
                    "original_deadline": r["original_deadline"].isoformat() if r["original_deadline"] else None,
                    "requested_deadline": r["requested_deadline"].isoformat() if r["requested_deadline"] else None,
                    "reason": r["reason"],
                    "escalation_level": r["escalation_level"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                })

    return ok(data={
        "pending_leaves": pending_leaves,
        "pending_extensions": pending_extensions,
    })
