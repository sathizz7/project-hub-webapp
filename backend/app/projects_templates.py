"""Static phase templates for new projects.

Mirrors frontend/src/lib/phases.ts so that POST /api/v1/projects can
auto-create the right set of phases for engineering vs research projects.
Keep these in sync until Phase 7 deletes the frontend copy.
"""

from typing import TypedDict


class _ChecklistItem(TypedDict, total=False):
    """A single checklist item under a phase template.

    Required fields are the ones the frontend's phases.ts always sets.
    Optional fields are marked via total=False (TypedDict's mechanism for
    optional keys at the type level).
    """

    label: str
    done: bool


class _PhaseTemplate(TypedDict):
    phase_name: str
    checklist: list[_ChecklistItem]


ENGINEERING_PHASES: list[_PhaseTemplate] = [
    {
        "phase_name": "Requirements",
        "checklist": [
            {"label": "Problem statement defined", "done": False},
            {"label": "Success criteria documented", "done": False},
            {"label": "Stakeholders identified", "done": False},
            {"label": "Scope boundaries set", "done": False},
        ],
    },
    {
        "phase_name": "Design",
        "checklist": [
            {"label": "Architecture diagram provided", "done": False},
            {"label": "Tech stack justified", "done": False},
            {"label": "API contracts defined", "done": False},
            {"label": "Data models designed", "done": False},
        ],
    },
    {
        "phase_name": "Development",
        "checklist": [
            {"label": "Core features implemented", "done": False},
            {"label": "Unit tests written", "done": False},
            {"label": "Code reviewed", "done": False},
            {"label": "Integration tests passing", "done": False},
        ],
    },
    {
        "phase_name": "Review",
        "checklist": [
            {"label": "Code review complete", "done": False},
            {"label": "Performance benchmarks met", "done": False},
            {"label": "Security review done", "done": False},
            {"label": "Documentation updated", "done": False},
        ],
    },
    {
        "phase_name": "Deploy",
        "checklist": [
            {"label": "Staging deployment successful", "done": False},
            {"label": "QA sign-off received", "done": False},
            {"label": "Rollback plan documented", "done": False},
            {"label": "Monitoring configured", "done": False},
        ],
    },
    {
        "phase_name": "Done",
        "checklist": [
            {"label": "Post-mortem completed", "done": False},
            {"label": "Metrics baseline established", "done": False},
        ],
    },
]

RESEARCH_PHASES: list[_PhaseTemplate] = [
    {
        "phase_name": "Hypothesis",
        "checklist": [
            {"label": "Research question defined", "done": False},
            {"label": "Hypothesis stated", "done": False},
            {"label": "Success metrics identified", "done": False},
            {"label": "Literature review done", "done": False},
        ],
    },
    {
        "phase_name": "Exploration",
        "checklist": [
            {"label": "Data sources identified", "done": False},
            {"label": "Data quality assessed", "done": False},
            {"label": "EDA completed", "done": False},
            {"label": "Feature candidates listed", "done": False},
        ],
    },
    {
        "phase_name": "Experiment",
        "checklist": [
            {"label": "Baseline model established", "done": False},
            {"label": "Experiments tracked", "done": False},
            {"label": "Hyperparameter tuning done", "done": False},
            {"label": "Results reproducible", "done": False},
        ],
    },
    {
        "phase_name": "Evaluation",
        "checklist": [
            {"label": "Model performance evaluated", "done": False},
            {"label": "Compared against baseline", "done": False},
            {"label": "Error analysis complete", "done": False},
            {"label": "Business impact estimated", "done": False},
        ],
    },
    {
        "phase_name": "Report",
        "checklist": [
            {"label": "Findings documented", "done": False},
            {"label": "Recommendations made", "done": False},
            {"label": "Presentation prepared", "done": False},
            {"label": "Next steps outlined", "done": False},
        ],
    },
    {
        "phase_name": "Done",
        "checklist": [
            {"label": "Knowledge transferred", "done": False},
            {"label": "Artifacts archived", "done": False},
        ],
    },
]


def template_for(project_type: str) -> list[_PhaseTemplate]:
    """Return the phase template list for a given project type.

    Raises ValueError on unknown types so the projects router can surface
    a 400 instead of crashing.
    """
    if project_type == "engineering":
        return ENGINEERING_PHASES
    if project_type == "research":
        return RESEARCH_PHASES
    raise ValueError(f"Unknown project type: {project_type!r}")
