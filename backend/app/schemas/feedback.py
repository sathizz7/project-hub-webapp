"""Pydantic models for the feedback router."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel


class FeedbackOut(BaseModel):
    id: str
    submission_id: str
    from_user_id: Optional[str] = None
    text: str
    is_ai: bool
    created_at: datetime


class FeedbackCreate(BaseModel):
    text: str
    is_ai: bool = False
