"""Pydantic models for the inbox aggregator."""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel


class InboxUser(BaseModel):
    id: str
    name: str
    avatar_color: str


class InboxLeave(BaseModel):
    id: str
    user: InboxUser
    type: str
    start_date: str
    end_date: str
    days: float
    reason: Optional[str] = None
    created_at: datetime


class InboxExtension(BaseModel):
    id: str
    requested_by: InboxUser
    project_id: Optional[str] = None
    project_title: Optional[str] = None
    task_id: Optional[str] = None
    task_title: Optional[str] = None
    original_deadline: datetime
    requested_deadline: datetime
    reason: Optional[str] = None
    escalation_level: int
    created_at: datetime


class InboxResponse(BaseModel):
    pending_leaves: List[InboxLeave]
    pending_extensions: List[InboxExtension]
