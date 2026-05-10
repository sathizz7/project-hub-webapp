"""Projects router — CRUD + assignees + hydrated reads."""

from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user, require_roles
from app.db import get_conn
from app.projects_templates import template_for
from app.responses import ok
from app.schemas.projects import (
    AddAssigneesRequest,
    ProjectCreate,
    ProjectUpdate,
)


router = APIRouter(tags=["projects"])


# =============================================================================
# Helpers (work inside an open psycopg cursor)
# =============================================================================

def _user_summary(row: dict) -> dict | None:
    """Shape a JOIN'd users.* row (aliased u_*) into the public user dict.

    Returns None if u_id is NULL (LEFT JOIN missed).
    """
    if row.get("u_id") is None:
        return None
    return {
        "id": str(row["u_id"]),
        "name": row["u_name"],
        "email": row["u_email"],
        "role": row["u_role"],
        "role_type": row["u_role_type"],
        "avatar_color": row["u_avatar_color"],
    }


def _list_assignees(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM project_assignees pa JOIN users u ON pa.user_id = u.id
        WHERE pa.project_id = %s ORDER BY u.name
        """,
        (project_id,),
    )
    return [_user_summary(r) for r in cur.fetchall() if _user_summary(r) is not None]


def _list_phases(cur, project_id: str) -> list[dict]:
    cur.execute(
        '''SELECT id, project_id, phase_name, status, checklist, "order"
           FROM phases WHERE project_id = %s ORDER BY "order"''',
        (project_id,),
    )
    return [
        {
            "id": str(r["id"]),
            "project_id": str(r["project_id"]),
            "phase_name": r["phase_name"],
            "status": r["status"],
            "checklist": r["checklist"] if r["checklist"] is not None else [],
            "order": r["order"],
        }
        for r in cur.fetchall()
    ]


def _list_tasks(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT t.*, u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM tasks t LEFT JOIN users u ON t.assignee_id = u.id
        WHERE t.project_id = %s ORDER BY t.created_at DESC
        """,
        (project_id,),
    )
    out = []
    for r in cur.fetchall():
        out.append({
            "id": str(r["id"]),
            "project_id": str(r["project_id"]) if r["project_id"] else None,
            "phase_id": str(r["phase_id"]) if r["phase_id"] else None,
            "title": r["title"],
            "description": r["description"],
            "due_date": r["due_date"].isoformat() if r["due_date"] else None,
            "priority": r["priority"],
            "status": r["status"],
            "assignee": _user_summary(r),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
            "completed_at": r["completed_at"].isoformat() if r["completed_at"] else None,
        })
    return out


def _list_submissions(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT s.*, u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM submissions s LEFT JOIN users u ON s.user_id = u.id
        WHERE s.project_id = %s ORDER BY s.created_at DESC
        """,
        (project_id,),
    )
    submissions = []
    for r in cur.fetchall():
        submissions.append({
            "id": str(r["id"]),
            "title": r["title"],
            "type": r["type"],
            "description": r["description"],
            "link": r["link"],
            "user": _user_summary(r),
            "feedback": [],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })
    if not submissions:
        return submissions
    sub_ids = [s["id"] for s in submissions]
    cur.execute(
        """
        SELECT f.id, f.submission_id, f.text, f.is_ai, f.created_at,
               u.id AS u_id, u.name AS u_name, u.email AS u_email,
               u.role AS u_role, u.role_type AS u_role_type, u.avatar_color AS u_avatar_color
        FROM feedback f LEFT JOIN users u ON f.from_user_id = u.id
        WHERE f.submission_id = ANY(%s) ORDER BY f.created_at
        """,
        (sub_ids,),
    )
    fb_by_sub: dict[str, list] = {}
    for r in cur.fetchall():
        fb_by_sub.setdefault(str(r["submission_id"]), []).append({
            "id": str(r["id"]),
            "submission_id": str(r["submission_id"]),
            "text": r["text"],
            "is_ai": r["is_ai"],
            "from_user": _user_summary(r),
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        })
    for s in submissions:
        s["feedback"] = fb_by_sub.get(s["id"], [])
    return submissions


def _list_checkpoints(cur, project_id: str) -> list[dict]:
    cur.execute(
        """
        SELECT id, decision, notes, created_at FROM checkpoints
        WHERE project_id = %s ORDER BY created_at DESC
        """,
        (project_id,),
    )
    return [
        {
            "id": str(r["id"]),
            "decision": r["decision"],
            "notes": r["notes"],
            "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        }
        for r in cur.fetchall()
    ]


def _user_can_see_project(cur, project_id: str, user: CurrentUser) -> bool:
    if user.role_type == "ceo":
        return True
    cur.execute(
        "SELECT 1 FROM project_assignees WHERE project_id = %s AND user_id = %s",
        (project_id, user.user_id),
    )
    return cur.fetchone() is not None


def _hydrate(project_id: str) -> dict | None:
    """Return the hydrated project shape for a given id. None if not found."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, title, type, requirement, status, priority, current_phase,
                       timebox_days, start_date, tech_stack, ai_plan,
                       created_at, updated_at
                FROM projects WHERE id = %s
                """,
                (project_id,),
            )
            project = cur.fetchone()
            if project is None:
                return None
            assignees_raw = _list_assignees(cur, project_id)
            assignees = [{"user": a} for a in assignees_raw]
            phases = _list_phases(cur, project_id)
            tasks = _list_tasks(cur, project_id)
            submissions = _list_submissions(cur, project_id)
            checkpoints = _list_checkpoints(cur, project_id)
    return {
        "id": str(project["id"]),
        "title": project["title"],
        "type": project["type"],
        "requirement": project["requirement"],
        "status": project["status"],
        "priority": project["priority"],
        "current_phase": project["current_phase"],
        "timebox_days": project["timebox_days"],
        "start_date": project["start_date"].isoformat() if project["start_date"] else None,
        "tech_stack": project["tech_stack"],
        "ai_plan": project["ai_plan"],
        "created_at": project["created_at"].isoformat() if project["created_at"] else None,
        "updated_at": project["updated_at"].isoformat() if project["updated_at"] else None,
        "assignees": assignees,
        "phases": phases,
        "tasks": tasks,
        "submissions": submissions,
        "checkpoints": checkpoints,
    }


def _shape_list_row(p: dict, assignees: list[dict], progress: int) -> dict:
    return {
        "id": str(p["id"]),
        "title": p["title"],
        "type": p["type"],
        "status": p["status"],
        "priority": p["priority"],
        "current_phase": p["current_phase"],
        "timebox_days": p["timebox_days"],
        "start_date": p["start_date"].isoformat() if p["start_date"] else None,
        "progress": progress,
        "assignees": assignees,
        "created_at": p["created_at"].isoformat() if p["created_at"] else None,
    }


# =============================================================================
# Endpoints
# =============================================================================

@router.get("/api/v1/projects")
def list_projects(user: CurrentUser = Depends(get_current_user)) -> dict:
    """List projects. CEO sees all; member sees only assigned."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            if user.role_type == "ceo":
                cur.execute(
                    """
                    SELECT id, title, type, status, priority, current_phase, timebox_days,
                           start_date, created_at
                    FROM projects ORDER BY created_at DESC
                    """
                )
            else:
                cur.execute(
                    """
                    SELECT p.id, p.title, p.type, p.status, p.priority, p.current_phase,
                           p.timebox_days, p.start_date, p.created_at
                    FROM projects p
                    JOIN project_assignees pa ON pa.project_id = p.id
                    WHERE pa.user_id = %s
                    ORDER BY p.created_at DESC
                    """,
                    (user.user_id,),
                )
            projects = cur.fetchall()
            results = []
            for p in projects:
                pid = str(p["id"])
                cur.execute(
                    """
                    SELECT
                        count(*) FILTER (WHERE status = 'completed') AS done,
                        count(*) AS total
                    FROM phases WHERE project_id = %s
                    """,
                    (pid,),
                )
                row = cur.fetchone()
                progress = int(round(100 * row["done"] / row["total"])) if row["total"] else 0
                assignees = _list_assignees(cur, pid)
                results.append(_shape_list_row(p, assignees, progress))
    return ok(data=results)


@router.get("/api/v1/my/projects")
def list_my_projects(user: CurrentUser = Depends(get_current_user)) -> dict:
    """Caller's assigned projects (works for CEO too — filtered to their own)."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT p.id, p.title, p.type, p.status, p.priority, p.current_phase,
                       p.timebox_days, p.start_date, p.created_at
                FROM projects p
                JOIN project_assignees pa ON pa.project_id = p.id
                WHERE pa.user_id = %s
                ORDER BY p.created_at DESC
                """,
                (user.user_id,),
            )
            projects = cur.fetchall()
            results = []
            for p in projects:
                pid = str(p["id"])
                cur.execute(
                    """
                    SELECT count(*) FILTER (WHERE status = 'completed') AS done,
                           count(*) AS total
                    FROM phases WHERE project_id = %s
                    """,
                    (pid,),
                )
                row = cur.fetchone()
                progress = int(round(100 * row["done"] / row["total"])) if row["total"] else 0
                results.append(_shape_list_row(p, _list_assignees(cur, pid), progress))
    return ok(data=results)


@router.post("/api/v1/projects", dependencies=[Depends(require_roles("ceo"))])
def create_project(payload: ProjectCreate, user: CurrentUser = Depends(get_current_user)) -> dict:
    """Create project + auto-create phases + assign creator + extras (one transaction)."""
    template = template_for(payload.type)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO projects (title, type, requirement, status, priority,
                                      timebox_days, tech_stack, ai_plan, created_by)
                VALUES (%(title)s, %(type)s, %(requirement)s, 'active', %(priority)s,
                        %(timebox_days)s, %(tech_stack)s, %(ai_plan)s, %(created_by)s)
                RETURNING id
                """,
                {
                    "title": payload.title,
                    "type": payload.type,
                    "requirement": payload.requirement,
                    "priority": payload.priority,
                    "timebox_days": payload.timebox_days,
                    "tech_stack": psycopg.types.json.Json(payload.tech_stack)
                    if payload.tech_stack is not None else None,
                    "ai_plan": psycopg.types.json.Json(payload.ai_plan)
                    if payload.ai_plan is not None else None,
                    "created_by": user.user_id,
                },
            )
            project_id = str(cur.fetchone()["id"])

            for i, phase in enumerate(template):
                cur.execute(
                    '''
                    INSERT INTO phases (project_id, phase_name, status, checklist, "order")
                    VALUES (%s, %s, 'pending', %s, %s)
                    ''',
                    (
                        project_id,
                        phase["phase_name"],
                        psycopg.types.json.Json(phase["checklist"]),
                        i,
                    ),
                )

            assignee_set = set(payload.assignee_ids) | {user.user_id}
            for uid in assignee_set:
                cur.execute(
                    """
                    INSERT INTO project_assignees (project_id, user_id)
                    VALUES (%s, %s) ON CONFLICT DO NOTHING
                    """,
                    (project_id, uid),
                )
        conn.commit()

    hydrated = _hydrate(project_id)
    if hydrated is None:
        raise HTTPException(status.HTTP_500_INTERNAL_SERVER_ERROR, detail="Project disappeared after create")
    return ok(data=hydrated, message="Created")


@router.get("/api/v1/projects/{project_id}")
def get_project(project_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Existence check + access check in one place
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            if not _user_can_see_project(cur, pid, user):
                # Don't leak existence
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    hydrated = _hydrate(pid)
    if hydrated is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    return ok(data=hydrated)


@router.patch("/api/v1/projects/{project_id}", dependencies=[Depends(require_roles("ceo"))])
def update_project(project_id: UUID, payload: ProjectUpdate) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    if "tech_stack" in fields and fields["tech_stack"] is not None:
        fields["tech_stack"] = psycopg.types.json.Json(fields["tech_stack"])
    if "ai_plan" in fields and fields["ai_plan"] is not None:
        fields["ai_plan"] = psycopg.types.json.Json(fields["ai_plan"])
    set_clauses = ", ".join(f"{k} = %({k})s" for k in fields)
    fields["__id"] = str(project_id)
    sql = f"UPDATE projects SET {set_clauses}, updated_at = now() WHERE id = %(__id)s RETURNING id"
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, fields)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
    hydrated = _hydrate(str(project_id))
    return ok(data=hydrated)


@router.post(
    "/api/v1/projects/{project_id}/assignees",
    dependencies=[Depends(require_roles("ceo"))],
)
def add_assignees(project_id: UUID, payload: AddAssigneesRequest) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            for uid in payload.user_ids:
                cur.execute(
                    """
                    INSERT INTO project_assignees (project_id, user_id)
                    VALUES (%s, %s) ON CONFLICT DO NOTHING
                    """,
                    (pid, uid),
                )
        conn.commit()
    hydrated = _hydrate(pid)
    return ok(data=hydrated)


@router.delete(
    "/api/v1/projects/{project_id}/assignees/{user_id}",
    dependencies=[Depends(require_roles("ceo"))],
)
def remove_assignee(project_id: UUID, user_id: UUID) -> dict:
    pid = str(project_id)
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT 1 FROM projects WHERE id = %s", (pid,))
            if cur.fetchone() is None:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Project not found")
            cur.execute(
                "DELETE FROM project_assignees WHERE project_id = %s AND user_id = %s",
                (pid, str(user_id)),
            )
        conn.commit()
    hydrated = _hydrate(pid)
    return ok(data=hydrated)
