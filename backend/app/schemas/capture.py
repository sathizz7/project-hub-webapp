"""Pydantic models for the capture router."""

from datetime import datetime
from typing import List, Literal, Optional

from pydantic import BaseModel


CaptureItemType = Literal["todo", "follow_up", "commitment", "meeting", "review", "timeline"]
CaptureItemStatus = Literal["pending", "converted", "dismissed"]


class CaptureItemOut(BaseModel):
    id: str
    session_id: str
    type: CaptureItemType
    raw_text: Optional[str] = None
    title: str
    description: Optional[str] = None
    department: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: str
    status: CaptureItemStatus
    project_id: Optional[str] = None
    converted_to_type: Optional[str] = None
    converted_to_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class CaptureSessionOut(BaseModel):
    id: str
    user_id: str
    raw_input: str
    created_at: datetime
    items: List[CaptureItemOut] = []


class CaptureProcessRequest(BaseModel):
    """POST /capture/process body."""
    raw_input: str


class CaptureItemUpdate(BaseModel):
    """PATCH /capture/items/{id} body."""
    status: Optional[CaptureItemStatus] = None
    project_id: Optional[str] = None
    converted_to_type: Optional[str] = None
    converted_to_id: Optional[str] = None
