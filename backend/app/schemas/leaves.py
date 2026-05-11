"""Pydantic models for the leaves router."""

from datetime import date, datetime
from decimal import Decimal
from typing import Literal, Optional

from pydantic import BaseModel


LeaveType = Literal["planned", "sick", "personal", "wfh", "half_day"]
LeaveStatus = Literal["pending", "approved", "rejected"]


class LeaveOut(BaseModel):
    id: str
    user_id: str
    type: LeaveType
    start_date: date
    end_date: date
    days: Decimal
    reason: Optional[str] = None
    status: LeaveStatus
    approved_by_id: Optional[str] = None
    cover_person_id: Optional[str] = None
    created_at: datetime
    updated_at: Optional[datetime] = None


class LeaveCreate(BaseModel):
    type: LeaveType
    start_date: date
    end_date: date
    days: Decimal
    reason: Optional[str] = None
    cover_person_id: Optional[str] = None


class LeaveUpdate(BaseModel):
    """CEO uses this to approve/reject and optionally set cover person."""

    status: Optional[LeaveStatus] = None
    cover_person_id: Optional[str] = None
