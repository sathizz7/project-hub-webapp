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
