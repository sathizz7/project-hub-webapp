"""Users router — list/get/create/update."""

from uuid import UUID

import psycopg
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import CurrentUser, get_current_user, hash_password, require_roles
from app.db import get_conn
from app.responses import ok
from app.schemas.users import UserCreate, UserUpdate


router = APIRouter(prefix="/api/v1/users", tags=["users"])


@router.get("")
def list_users(_user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, role, role_type, avatar_color
                FROM users ORDER BY name
                """
            )
            rows = cur.fetchall()
    return ok(data=[{**r, "id": str(r["id"])} for r in rows])


@router.get("/{user_id}")
def get_user(user_id: UUID, _user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, role, role_type, avatar_color
                FROM users WHERE id = %s
                """,
                (str(user_id),),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return ok(data={**row, "id": str(row["id"])})


@router.post("", dependencies=[Depends(require_roles("ceo"))])
def create_user(payload: UserCreate) -> dict:
    pw_hash = hash_password(payload.password)
    try:
        with get_conn() as conn:
            with conn.cursor() as cur:
                cur.execute(
                    """
                    INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                    VALUES (%(name)s, %(email)s, %(role)s, %(role_type)s, %(avatar_color)s, %(pw)s)
                    RETURNING id, name, email, role, role_type, avatar_color
                    """,
                    {
                        "name": payload.name,
                        "email": payload.email,
                        "role": payload.role,
                        "role_type": payload.role_type,
                        "avatar_color": payload.avatar_color,
                        "pw": pw_hash,
                    },
                )
                row = cur.fetchone()
            conn.commit()
    except psycopg.errors.UniqueViolation:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="Email already in use")
    return ok(data={**row, "id": str(row["id"])}, message="Created")


@router.patch("/{user_id}", dependencies=[Depends(require_roles("ceo"))])
def update_user(user_id: UUID, payload: UserUpdate) -> dict:
    fields = payload.model_dump(exclude_unset=True)
    if not fields:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="No fields to update")
    set_clauses = ", ".join(f"{k} = %({k})s" for k in fields)
    fields["__id"] = str(user_id)
    sql = f"""
        UPDATE users SET {set_clauses}, updated_at = now()
        WHERE id = %(__id)s
        RETURNING id, name, email, role, role_type, avatar_color
    """
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(sql, fields)
            row = cur.fetchone()
        conn.commit()
    if row is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found")
    return ok(data={**row, "id": str(row["id"])})
