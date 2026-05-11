"""Pydantic models for the AI router."""

from typing import Optional

from pydantic import BaseModel


class GeneratePlanRequest(BaseModel):
    requirement: str
    type: str  # "engineering" | "research"


class GeneratePlanResponse(BaseModel):
    summary: Optional[str] = None
    phases: list = []
    milestones: list = []
    kill_criteria: list = []
    risks: list = []
    tech_stack: list = []


class ReviewRequest(BaseModel):
    submission_title: str
    submission_type: str
    description: Optional[str] = None
    link: Optional[str] = None


class ReviewResponse(BaseModel):
    feedback: str


class SuggestStackRequest(BaseModel):
    description: str


class SuggestStackResponse(BaseModel):
    tech_stack: list
