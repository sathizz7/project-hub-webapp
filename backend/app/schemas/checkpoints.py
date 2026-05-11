"""Pydantic models for the checkpoints router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


CheckpointDecision = Literal["continue", "kill"]


class CheckpointOut(BaseModel):
    id: str
    project_id: str
    decision: CheckpointDecision
    notes: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime


class CheckpointCreate(BaseModel):
    decision: CheckpointDecision
    notes: Optional[str] = None
