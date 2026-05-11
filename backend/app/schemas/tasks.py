"""Pydantic models for the tasks router."""

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel


TaskStatus = Literal["planning", "in_progress", "blocked", "completed", "killed"]
TaskPriority = Literal["low", "medium", "high", "critical"]


class TaskOut(BaseModel):
    id: str
    project_id: Optional[str] = None
    phase_id: Optional[str] = None
    assignee_id: Optional[str] = None
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority
    status: TaskStatus
    created_at: datetime
    updated_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None


class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    project_id: Optional[str] = None
    phase_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: TaskPriority = "medium"
    status: TaskStatus = "planning"


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    phase_id: Optional[str] = None
    assignee_id: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Optional[TaskPriority] = None
    status: Optional[TaskStatus] = None
