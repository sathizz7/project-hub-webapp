"""Authentication primitives — JWT, bcrypt, FastAPI dependencies."""

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Callable

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, status

from app.config import settings


ACCESS_TOKEN_TTL = timedelta(days=30)
REFRESH_TOKEN_TTL = timedelta(days=90)
JWT_ALGORITHM = "HS256"


@dataclass(frozen=True)
class CurrentUser:
    user_id: str
    role_type: str


def hash_password(plain: str) -> str:
    return bcrypt.hashpw(plain.encode("utf-8"), bcrypt.gensalt(rounds=12)).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except (ValueError, TypeError):
        return False


def issue_access_token(user_id: str, role_type: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "role_type": role_type,
        "iat": now,
        "exp": now + ACCESS_TOKEN_TTL,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def issue_refresh_token(user_id: str) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "user_id": user_id,
        "type": "refresh",
        "iat": now,
        "exp": now + REFRESH_TOKEN_TTL,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.jwt_secret, algorithms=[JWT_ALGORITHM])


def get_current_user(request: Request) -> CurrentUser:
    auth_header = request.headers.get("authorization", "")
    if not auth_header.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or invalid Authorization header",
        )
    token = auth_header.split(" ", 1)[1].strip()
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )
    if payload.get("type") == "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token cannot authenticate API requests",
        )
    return CurrentUser(user_id=payload["user_id"], role_type=payload["role_type"])


def require_roles(*allowed_roles: str) -> Callable[[CurrentUser], CurrentUser]:
    def _checker(user: CurrentUser = Depends(get_current_user)) -> CurrentUser:
        if user.role_type not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions",
            )
        return user
    return _checker
