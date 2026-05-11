"""Pydantic models for the submissions router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


SubmissionType = Literal["document", "code", "architecture", "notebook", "demo"]


class SubmissionOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    phase_id: Optional[str] = None
    user_id: str
    title: str
    type: SubmissionType
    description: Optional[str] = None
    link: Optional[str] = None
    created_at: datetime


class SubmissionCreate(BaseModel):
    project_id: str
    phase_id: Optional[str] = None
    title: str
    type: SubmissionType
    description: Optional[str] = None
    link: Optional[str] = None
