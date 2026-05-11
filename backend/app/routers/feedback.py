"""Feedback router — nested under submissions; list + create."""

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.feedback import FeedbackCreate
from app.shapes import shape_feedback


router = APIRouter(tags=["feedback"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _user_can_see_submission(cur, submission_id: str, user: CurrentUser) -> tuple[bool, dict | None]:
    """Return (allowed, submission_row). Submission must exist."""
    cur.execute(
        "SELECT id, project_id FROM submissions WHERE id = %s",
        (submission_id,),
    )
    row = cur.fetchone()
    if row is None:
        return False, None
    if row["project_id"] is None:
        return user.role_type == "ceo", row
    return _user_can_see_project(cur, str(row["project_id"]), user), row


@router.get("/api/v1/submissions/{submission_id}/feedback")
def list_feedback(submission_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            allowed, row = _user_can_see_submission(cur, str(submission_id), user)
            if row is None or not allowed:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
            cur.execute(
                """
                SELECT id, submission_id, from_user_id, text, is_ai, created_at
                FROM feedback WHERE submission_id = %s
                ORDER BY created_at
                """,
                (str(submission_id),),
            )
            rows = cur.fetchall()
    return ok(data=[shape_feedback(r) for r in rows])


@router.post("/api/v1/submissions/{submission_id}/feedback")
def create_feedback(
    submission_id: UUID,
    payload: FeedbackCreate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            allowed, row = _user_can_see_submission(cur, str(submission_id), user)
            if row is None or not allowed:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Submission not found")
            cur.execute(
                """
                INSERT INTO feedback (submission_id, from_user_id, text, is_ai)
                VALUES (%s, %s, %s, %s)
                RETURNING id, submission_id, from_user_id, text, is_ai, created_at
                """,
                (str(submission_id), user.user_id, payload.text, payload.is_ai),
            )
            new_row = cur.fetchone()
            assert new_row is not None  # INSERT ... RETURNING always yields a row
        conn.commit()
    return ok(data=shape_feedback(new_row), message="Created")
