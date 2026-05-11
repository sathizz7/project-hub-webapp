"""Inbox aggregator — CEO landing page data."""

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, get_current_user, require_roles
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
def get_inbox(user: CurrentUser = Depends(get_current_user)) -> dict:
    """Return pending leaves, extensions, reviews, and captures for the CEO."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # 1. Pending leaves with requester
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

            # 2. Pending extensions with requester + project + task
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

            # 3. Submissions not yet reviewed by the calling CEO.
            # Orphan rows (NULL project_id or user_id) are filtered out via the
            # WHERE clause — real data should never have these gaps, and if it
            # does the CEO can investigate separately.
            cur.execute(
                """
                SELECT
                    s.id, s.title, s.created_at,
                    p.id   AS p_id,   p.title AS p_title,
                    u.id   AS u_id,   u.name  AS u_name,
                    u.avatar_color    AS u_avatar_color
                FROM submissions s
                LEFT JOIN projects p ON s.project_id = p.id
                LEFT JOIN users    u ON s.user_id    = u.id
                WHERE p.id IS NOT NULL
                  AND u.id IS NOT NULL
                  AND NOT EXISTS (
                      SELECT 1 FROM feedback f
                      WHERE f.submission_id = s.id
                        AND f.from_user_id  = %s
                  )
                ORDER BY s.created_at ASC
                """,
                (user.user_id,),
            )
            pending_reviews = []
            for r in cur.fetchall():
                pending_reviews.append({
                    "id": str(r["id"]),
                    "title": r["title"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                    "project": {
                        "id": str(r["p_id"]),
                        "title": r["p_title"],
                    },
                    "submitter": {
                        "id": str(r["u_id"]),
                        "name": r["u_name"],
                        "avatar_color": r["u_avatar_color"],
                    },
                })

            # 4. Pending capture items from the calling CEO's own sessions.
            # The DB column is named `type`; renamed to `item_type` in the API
            # response to match the frontend CaptureInboxItem.itemType field.
            cur.execute(
                """
                SELECT ci.id, ci.title, ci.type, ci.priority, ci.created_at
                FROM capture_items    ci
                JOIN capture_sessions cs ON ci.session_id = cs.id
                WHERE ci.status   = 'pending'
                  AND cs.user_id  = %s
                ORDER BY ci.created_at ASC
                """,
                (user.user_id,),
            )
            pending_captures = []
            for r in cur.fetchall():
                pending_captures.append({
                    "id": str(r["id"]),
                    "title": r["title"],
                    "item_type": r["type"],
                    "priority": r["priority"],
                    "created_at": r["created_at"].isoformat() if r["created_at"] else None,
                })

    return ok(data={
        "pending_leaves": pending_leaves,
        "pending_extensions": pending_extensions,
        "pending_reviews": pending_reviews,
        "pending_captures": pending_captures,
    })
