"""Pydantic models for the deadline-extensions router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


ExtensionStatus = Literal["pending", "approved", "rejected", "auto_escalated"]


class ExtensionOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    requested_by_id: str
    original_deadline: datetime
    requested_deadline: datetime
    reason: Optional[str] = None
    status: ExtensionStatus
    ceo_comment: Optional[str] = None
    approved_by_id: Optional[str] = None
    escalation_level: int
    created_at: datetime
    updated_at: Optional[datetime] = None


class ExtensionCreate(BaseModel):
    project_id: Optional[str] = None
    task_id: Optional[str] = None
    original_deadline: datetime
    requested_deadline: datetime
    reason: Optional[str] = None


class ExtensionUpdate(BaseModel):
    """CEO uses this to approve/reject and optionally leave a comment."""

    status: Optional[ExtensionStatus] = None
    ceo_comment: Optional[str] = None
