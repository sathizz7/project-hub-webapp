"""Submissions router — list/get/create."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.submissions import SubmissionCreate
from app.shapes import shape_feedback


router = APIRouter(prefix="/api/v1/submissions", tags=["submissions"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _shape_submission(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "phase_id": str(r["phase_id"]) if r["phase_id"] else None,
        "user_id": str(r["user_id"]),
        "title": r["title"],
        "type": r["type"],
        "description": r["description"],
        "link": r["link"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


@router.get("")
def list_submissions(
    project_id: Optional[UUID] = Query(None),
    phase_id: Optional[UUID] = Query(None),
    user_id: Optional[UUID] = Query(None),
    include: Optional[str] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    include_feedback = include is not None and "feedback" in [v.strip() for v in include.split(",")]

    where_clauses = []
    params: list = []
    if project_id is not None:
        where_clauses.append("s.project_id = %s")
        params.append(str(project_id))
    if phase_id is not None:
        where_clauses.append("s.phase_id = %s")
        params.append(str(phase_id))
    if user_id is not None:
        where_clauses.append("s.user_id = %s")
        params.append(str(user_id))

    if user.role_type != "ceo":
        where_clauses.append(
            "s.project_id IN (SELECT project_id FROM project_assignees WHERE user_id = %s)"
        )
        params.append(user.user_id)

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, project_id, phase_id, user_id, title, type, description, link, created_at
        FROM submissions s
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()

            if not rows:
                return ok(data=[])

            shaped = [_shape_submission(r) for r in rows]

            if include_feedback:
                sub_ids = [r["id"] for r in rows]
                cur.execute(
                    """
                    SELECT id, submission_id, from_user_id, text, is_ai, created_at
                    FROM feedback
                    WHERE submission_id = ANY(%s)
                    ORDER BY created_at
                    """,
                    (sub_ids,),
                )
                fb_rows = cur.fetchall()

                feedback_by_sub: dict = {}
                for fb in fb_rows:
                    key = str(fb["submission_id"])
                    feedback_by_sub.setdefault(key, []).append(shape_feedback(fb))

                for item in shaped:
                    item["feedback"] = feedback_by_sub.get(item["id"], [])

    return ok(data=shaped)


@router.get("/{submission_id}")
def get_submission(submission_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, phase_id, user_id, title, type, description, link, created_at
                FROM submissions WHERE id = %s
                """,
                (str(submission_id),),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
            if row["project_id"] is not None and not _user_can_see_project(
                cur, str(row["project_id"]), user
            ):
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
    return ok(data=_shape_submission(row))


@router.post("")
def create_submission(
    payload: SubmissionCreate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if not _user_can_see_project(cur, payload.project_id, user):
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO submissions (project_id, phase_id, user_id, title, type, description, link)
                VALUES (%(project_id)s, %(phase_id)s, %(user_id)s, %(title)s,
                        %(type)s, %(description)s, %(link)s)
                RETURNING id, project_id, phase_id, user_id, title, type, description, link, created_at
                """,
                {
                    "project_id": payload.project_id,
                    "phase_id": payload.phase_id,
                    "user_id": user.user_id,
                    "title": payload.title,
                    "type": payload.type,
                    "description": payload.description,
                    "link": payload.link,
                },
            )
            row = cur.fetchone()
        conn.commit()
    return ok(data=_shape_submission(row), message="Created")
