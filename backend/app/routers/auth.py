"""Auth router — POST /login, GET /me, POST /refresh, POST /logout."""

import jwt
from fastapi import APIRouter, Depends, HTTPException, status

from app.auth import (
    CurrentUser,
    decode_token,
    get_current_user,
    issue_access_token,
    issue_refresh_token,
    verify_password,
)
from app.db import get_conn
from app.responses import ok
from app.schemas.auth import LoginRequest, RefreshRequest


router = APIRouter(prefix="/api/v1/auth", tags=["auth"])


@router.post("/login")
def login(payload: LoginRequest) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, name, email, role, role_type, avatar_color, password_hash
                FROM users WHERE email = %s
                """,
                (payload.email,),
            )
            user = cur.fetchone()

    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    user_id = str(user["id"])
    return ok(
        data={
            "access_token": issue_access_token(user_id, user["role_type"]),
            "refresh_token": issue_refresh_token(user_id),
            "user": {
                "id": user_id,
                "name": user["name"],
                "email": user["email"],
                "role": user["role"],
                "role_type": user["role_type"],
                "avatar_color": user["avatar_color"],
            },
        }
    )


@router.get("/me")
def me(user: CurrentUser = Depends(get_current_user)) -> dict:
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, role, role_type, avatar_color FROM users WHERE id = %s",
                (user.user_id,),
            )
            row = cur.fetchone()
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return ok(
        data={
            "id": str(row["id"]),
            "name": row["name"],
            "email": row["email"],
            "role": row["role"],
            "role_type": row["role_type"],
            "avatar_color": row["avatar_color"],
        }
    )


@router.post("/refresh")
def refresh(payload: RefreshRequest) -> dict:
    try:
        decoded = decode_token(payload.refresh_token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )
    if decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not a refresh token",
        )
    user_id = decoded["user_id"]
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT role_type FROM users WHERE id = %s", (user_id,))
            row = cur.fetchone()
    if row is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists",
        )
    return ok(data={"access_token": issue_access_token(user_id, row["role_type"])})


@router.post("/logout")
def logout() -> dict:
    return ok(message="Logged out")
