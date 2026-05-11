"""Shared row-shaping helpers used across routers."""


def shape_feedback(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "submission_id": str(r["submission_id"]),
        "from_user_id": str(r["from_user_id"]) if r["from_user_id"] else None,
        "text": r["text"],
        "is_ai": r["is_ai"],
        "created_at": r["created_at"].isoformat() if r["created_at"] else None,
    }


def shape_project_brief(r: dict) -> dict:
    """Subset of project for embedding in lists. Use shape_project() for the full hydrated form."""
    return {
        "id": str(r["id"]),
        "title": r["title"],
        "requirement": r["requirement"],
    }


def shape_phase_brief(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "phase_name": r["phase_name"],
    }


def shape_user_brief(r: dict) -> dict:
    return {
        "id": str(r["id"]),
        "name": r["name"],
        "avatar_color": r["avatar_color"],
    }
