"""Tasks router — CRUD + filters + /my/tasks."""

from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.responses import ok
from app.schemas.tasks import TaskCreate, TaskUpdate


router = APIRouter(tags=["tasks"])


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _shape_task(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "phase_id": str(r["phase_id"]) if r["phase_id"] else None,
        "assignee_id": str(r["assignee_id"]) if r["assignee_id"] else None,
        "title": r["title"],
        "description": r["description"],
        "due_date": r["due_date"].isoformat() if r["due_date"] else None,
        "priority": r["priority"],
        "status": r["status"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
        "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
    }


@router.get("/api/v1/tasks")
def list_tasks(
    project_id: Optional[UUID] = Query(None),
    phase_id: Optional[UUID] = Query(None),
    assignee_id: Optional[UUID] = Query(None),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    where_clauses = []
    params: list = []
    if project_id is not None:
        where_clauses.append("t.project_id = %s")
        params.append(str(project_id))
    if phase_id is not None:
        where_clauses.append("t.phase_id = %s")
        params.append(str(phase_id))
    if assignee_id is not None:
        where_clauses.append("t.assignee_id = %s")
        params.append(str(assignee_id))

    if user.role_type != "ceo":
        where_clauses.append(
            "(t.project_id IN (SELECT project_id FROM project_assignees WHERE user_id = %s) "
            "OR (t.project_id IS NULL AND t.assignee_id = %s))"
        )
        params.extend([user.user_id, user.user_id])

    where_sql = (" WHERE " + " AND ".join(where_clauses)) if where_clauses else ""
    sql = f"""
        SELECT id, project_id, phase_id, assignee_id, title, description,
               due_date, priority, status, created_at, updated_at, completed_at
        FROM tasks t
        {where_sql}
        ORDER BY created_at DESC
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, tuple(params))
            rows = cur.fetchall()
    return ok(data=[_shape_task(r) for r in rows])


@router.get("/api/v1/my/tasks")
def list_my_tasks(user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, phase_id, assignee_id, title, description,
                       due_date, priority, status, created_at, updated_at, completed_at
                FROM tasks
                WHERE assignee_id = %s
                ORDER BY created_at DESC
                """,
                (user.user_id,),
            )
            rows = cur.fetchall()
    return ok(data=[_shape_task(r) for r in rows])


@router.get("/api/v1/tasks/{task_id}")
def get_task(task_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, project_id, phase_id, assignee_id, title, description,
                       due_date, priority, status, created_at, updated_at, completed_at
                FROM tasks WHERE id = %s
                """,
                (str(task_id),),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
            if row["project_id"] is not None:
                if not _user_can_see_project(cur, str(row["project_id"]), user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
            else:
                if user.role_type != "ceo" and (
                    row["assignee_id"] is None or str(row["assignee_id"]) != user.user_id
                ):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
    return ok(data=_shape_task(row))


@router.post("/api/v1/tasks")
def create_task(payload: TaskCreate, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            if payload.project_id is not None:
                if not _user_can_see_project(cur, payload.project_id, user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                """
                INSERT INTO tasks (project_id, phase_id, assignee_id, title, description,
                                   due_date, priority, status)
                VALUES (%(project_id)s, %(phase_id)s, %(assignee_id)s, %(title)s,
                        %(description)s, %(due_date)s, %(priority)s, %(status)s)
                RETURNING id, project_id, phase_id, assignee_id, title, description,
                          due_date, priority, status, created_at, updated_at, completed_at
                """,
                {
                    "project_id": payload.project_id,
                    "phase_id": payload.phase_id,
                    "assignee_id": payload.assignee_id,
                    "title": payload.title,
                    "description": payload.description,
                    "due_date": payload.due_date,
                    "priority": payload.priority,
                    "status": payload.status,
                },
            )
            row = cur.fetchone()
        conn.commit()
    return ok(data=_shape_task(row), message="Created")


@router.patch("/api/v1/tasks/{task_id}")
def update_task(
    task_id: UUID, payload: TaskUpdate, user: CurrentUser = Depends(get_current_user)
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, project_id FROM tasks WHERE id = %s",
                (str(task_id),),
            )
            row = cur.fetchone()
            if row is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")
            if row["project_id"] is not None:
                if not _user_can_see_project(cur, str(row["project_id"]), user):
                    raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Task not found")

            set_pairs = []
            params: dict = {"__id": str(task_id)}
            for key, value in fields.items():
                set_pairs.append(f"{key} = %({key})s")
                params[key] = value

            if "status" in fields:
                if fields["status"] == "completed":
                    set_pairs.append("completed_at = now()")
                else:
                    set_pairs.append("completed_at = NULL")

            sql = (
                f"UPDATE tasks SET {', '.join(set_pairs)}, updated_at = now() "
                f"WHERE id = %(__id)s "
                f"RETURNING id, project_id, phase_id, assignee_id, title, description, "
                f"          due_date, priority, status, created_at, updated_at, completed_at"
            )
            cur.execute(sql, params)
            updated = cur.fetchone()
        conn.commit()
    return ok(data=_shape_task(updated))
