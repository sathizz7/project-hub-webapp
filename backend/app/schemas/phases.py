"""Pydantic models for the phases router."""

from typing import List, Literal, Optional

from pydantic import BaseModel


PhaseStatus = Literal["pending", "active", "completed"]


class PhaseOut(BaseModel):
    id: str
    project_id: str
    phase_name: str
    status: PhaseStatus
    checklist: List[dict]
    order: int


class ChecklistItem(BaseModel):
    label: str
    done: bool


class PhaseUpdate(BaseModel):
    checklist: Optional[List[ChecklistItem]] = None
    status: Optional[PhaseStatus] = None
