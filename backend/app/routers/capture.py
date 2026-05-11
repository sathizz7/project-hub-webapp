"""Capture router — sessions list/get/process, items patch."""

import logging
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status

from app.ai import call_llm, parse_json_response
from app.auth import CurrentUser, get_current_user
from app.db import get_conn
from app.prompts.capture import CAPTURE_SYSTEM_PROMPT
from app.responses import ok
from app.schemas.capture import CaptureItemUpdate, CaptureProcessRequest


logger = logging.getLogger("app.routers.capture")

router = APIRouter(prefix="/api/v1/capture", tags=["capture"])


def _shape_item(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "session_id": str(r["session_id"]),
        "type": r["type"],
        "raw_text": r["raw_text"],
        "title": r["title"],
        "description": r["description"],
        "department": r["department"],
        "due_date": r["due_date"].isoformat() if r["due_date"] else None,
        "priority": r["priority"],
        "status": r["status"],
        "project_id": str(r["project_id"]) if r["project_id"] else None,
        "converted_to_type": r["converted_to_type"],
        "converted_to_id": str(r["converted_to_id"]) if r["converted_to_id"] else None,
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "updated_at": r["updated_at"].isoformat() if r["updated_at"] else None,
    }


def _shape_session(r: dict, items: list[dict]) -> dict:
    return {
        "id": str(r["id"]),
        "user_id": str(r["user_id"]),
        "raw_input": r["raw_input"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
        "items": items,
    }


@router.get("/sessions")
def list_sessions(
    limit: int = Query(20, ge=1, le=100),
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, raw_input, created_at
                FROM capture_sessions
                WHERE user_id = %s
                ORDER BY created_at DESC
                LIMIT %s
                """,
                (user.user_id, limit),
            )
            sessions = cur.fetchall()
            if not sessions:
                return ok(data=[])
            session_ids = [str(s["id"]) for s in sessions]
            cur.execute(
                """
                SELECT id, session_id, type, raw_text, title, description, department,
                       due_date, priority, status, project_id, converted_to_type,
                       converted_to_id, created_at, updated_at
                FROM capture_items
                WHERE session_id = ANY(%s)
                ORDER BY created_at
                """,
                (session_ids,),
            )
            items_by_session: dict[str, list[dict]] = {}
            for r in cur.fetchall():
                items_by_session.setdefault(str(r["session_id"]), []).append(_shape_item(r))
    return ok(data=[_shape_session(s, items_by_session.get(str(s["id"]), [])) for s in sessions])


@router.get("/sessions/{session_id}")
def get_session(session_id: UUID, user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, user_id, raw_input, created_at
                FROM capture_sessions WHERE id = %s
                """,
                (str(session_id),),
            )
            row = cur.fetchone()
            if row is None or str(row["user_id"]) != user.user_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Session not found")
            cur.execute(
                """
                SELECT id, session_id, type, raw_text, title, description, department,
                       due_date, priority, status, project_id, converted_to_type,
                       converted_to_id, created_at, updated_at
                FROM capture_items WHERE session_id = %s
                ORDER BY created_at
                """,
                (str(session_id),),
            )
            items = [_shape_item(r) for r in cur.fetchall()]
    return ok(data=_shape_session(row, items))


@router.post("/process")
def process_capture(
    payload: CaptureProcessRequest, user: CurrentUser = Depends(get_current_user)
) -> dict:
    """Parse raw input via LLM and save session + items atomically."""
    raw_input = payload.raw_input.strip()
    if not raw_input:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="raw_input is required")

    try:
        llm_text = call_llm(system=CAPTURE_SYSTEM_PROMPT, user=raw_input, max_tokens=1024)
        parsed = parse_json_response(llm_text, fallback=[])
        if not isinstance(parsed, list):
            logger.warning("capture/process: LLM returned non-list JSON — falling back to empty items. Raw: %r", llm_text[:200])
            parsed = []
        else:
            logger.info("capture/process: parsed %d items from LLM response", len(parsed))
    except Exception as exc:
        logger.error("capture/process: LLM call failed — saving session with empty items. %s: %s", type(exc).__name__, exc)
        parsed = []

    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO capture_sessions (user_id, raw_input)
                VALUES (%s, %s)
                RETURNING id, user_id, raw_input, created_at
                """,
                (user.user_id, raw_input),
            )
            session_row = cur.fetchone()
            assert session_row is not None
            session_id = str(session_row["id"])
            items: list[dict] = []
            for item in parsed:
                if not isinstance(item, dict):
                    continue
                cur.execute(
                    """
                    INSERT INTO capture_items
                      (session_id, type, raw_text, title, description, priority, status)
                    VALUES (%s, %s, %s, %s, %s, %s, 'pending')
                    RETURNING id, session_id, type, raw_text, title, description, department,
                              due_date, priority, status, project_id, converted_to_type,
                              converted_to_id, created_at, updated_at
                    """,
                    (
                        session_id,
                        item.get("type", "todo"),
                        raw_input,
                        item.get("title", "Untitled"),
                        item.get("description", ""),
                        item.get("priority", "medium"),
                    ),
                )
                new_item = cur.fetchone()
                assert new_item is not None
                items.append(_shape_item(new_item))
        conn.commit()
    return ok(data=_shape_session(session_row, items), message="Created")


@router.patch("/items/{item_id}")
def update_item(
    item_id: UUID,
    payload: CaptureItemUpdate,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT s.user_id
                FROM capture_items i JOIN capture_sessions s ON i.session_id = s.id
                WHERE i.id = %s
                """,
                (str(item_id),),
            )
            row = cur.fetchone()
            if row is None or str(row["user_id"]) != user.user_id:
                raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Item not found")
            set_pairs = [f"{k} = %({k})s" for k in fields]
            params: dict = {**fields, "__id": str(item_id)}
            sql = (
                f"UPDATE capture_items SET {', '.join(set_pairs)}, updated_at = now() "
                f"WHERE id = %(__id)s "
                f"RETURNING id, session_id, type, raw_text, title, description, department, "
                f"          due_date, priority, status, project_id, converted_to_type, "
                f"          converted_to_id, created_at, updated_at"
            )
            cur.execute(sql, params)
            updated = cur.fetchone()
            assert updated is not None
        conn.commit()
    return ok(data=_shape_item(updated))
