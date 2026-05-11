"""Pydantic models for the users router."""

from typing import Literal, Optional

from pydantic import BaseModel, EmailStr


RoleType = Literal["ceo", "team_member"]


class UserOut(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: str
    role_type: RoleType
    avatar_color: str


class UserCreate(BaseModel):
    name: str
    email: EmailStr
    role: str
    role_type: RoleType
    avatar_color: str
    password: str  # plaintext on the wire (HTTPS in prod); hashed before insert


class UserUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    role_type: Optional[RoleType] = None
    avatar_color: Optional[str] = None
