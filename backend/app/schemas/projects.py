"""Pydantic models for the projects router."""

from datetime import datetime
from typing import Any, List, Literal, Optional

from pydantic import BaseModel


ProjectType = Literal["engineering", "research"]
ProjectStatus = Literal["active", "completed", "killed"]
Priority = Literal["low", "medium", "high", "critical"]


class ProjectAssigneeUser(BaseModel):
    """User shape embedded inside a project's assignees list."""

    id: str
    name: str
    email: str
    role: str
    role_type: str
    avatar_color: str


class ProjectListRow(BaseModel):
    """One row in the GET /projects list (cards on the landing page)."""

    id: str
    title: str
    type: ProjectType
    status: ProjectStatus
    priority: Priority
    current_phase: Optional[str] = None
    timebox_days: Optional[int] = None
    start_date: Optional[datetime] = None
    progress: int  # 0-100, computed
    assignees: List[ProjectAssigneeUser]
    created_at: datetime


class HydratedAssignee(BaseModel):
    user: ProjectAssigneeUser


class HydratedPhase(BaseModel):
    id: str
    project_id: str
    phase_name: str
    status: Literal["pending", "active", "completed"]
    checklist: List[dict]
    order: int


class HydratedTask(BaseModel):
    id: str
    project_id: Optional[str]
    phase_id: Optional[str]
    title: str
    description: Optional[str] = None
    due_date: Optional[datetime] = None
    priority: Priority
    status: Literal["planning", "in_progress", "blocked", "completed", "killed"]
    assignee: Optional[ProjectAssigneeUser] = None
    created_at: datetime
    completed_at: Optional[datetime] = None


class HydratedFeedback(BaseModel):
    id: str
    submission_id: str
    text: str
    is_ai: bool
    from_user: Optional[ProjectAssigneeUser] = None
    created_at: datetime


class HydratedSubmission(BaseModel):
    id: str
    title: str
    type: Literal["document", "code", "architecture", "notebook", "demo"]
    description: Optional[str] = None
    link: Optional[str] = None
    user: Optional[ProjectAssigneeUser] = None
    feedback: List[HydratedFeedback]
    created_at: datetime


class HydratedCheckpoint(BaseModel):
    id: str
    decision: Literal["continue", "kill"]
    notes: Optional[str] = None
    created_at: datetime


class HydratedProject(BaseModel):
    """Full project + everything the workspace page needs."""

    id: str
    title: str
    type: ProjectType
    requirement: Optional[str] = None
    status: ProjectStatus
    priority: Priority
    current_phase: Optional[str] = None
    timebox_days: Optional[int] = None
    start_date: Optional[datetime] = None
    tech_stack: Optional[Any] = None
    ai_plan: Optional[Any] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    assignees: List[HydratedAssignee]
    phases: List[HydratedPhase]
    tasks: List[HydratedTask]
    submissions: List[HydratedSubmission]
    checkpoints: List[HydratedCheckpoint]


class ProjectCreate(BaseModel):
    title: str
    type: ProjectType
    requirement: Optional[str] = None
    priority: Priority
    timebox_days: Optional[int] = None
    tech_stack: Optional[Any] = None
    ai_plan: Optional[Any] = None
    assignee_ids: List[str] = []  # additional team members to assign


class ProjectUpdate(BaseModel):
    title: Optional[str] = None
    requirement: Optional[str] = None
    status: Optional[ProjectStatus] = None
    priority: Optional[Priority] = None
    current_phase: Optional[str] = None
    timebox_days: Optional[int] = None
    tech_stack: Optional[Any] = None
    ai_plan: Optional[Any] = None


class AddAssigneesRequest(BaseModel):
    user_ids: List[str]
