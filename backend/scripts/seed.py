"""Idempotent dev-data seeder.

Creates a CEO + four team members + two sample projects with phases,
tasks, and assignees. Skips entities that already exist (matched by
email for users, by title for projects).

Usage:
    python -m scripts.seed
"""

from app.db import get_conn
from app.auth import hash_password

# Static seed data — keep in sync with frontend's prisma/seed.ts as
# long as both worlds run side-by-side (Phases 2-6).

# Dev password for all seed users. Real users will set their own via
# Phase 7's password reset flow (out of scope; not in current plan set).
_DEV_PASSWORD = "projecthub-dev"
_DEV_PASSWORD_HASH = hash_password(_DEV_PASSWORD)

_USERS = [
    {
        "name": "Sundar Iyer",
        "email": "ceo@projecthub.dev",
        "role": "Chief Executive Officer",
        "role_type": "ceo",
        "avatar_color": "#4F46E5",
        "password_hash": _DEV_PASSWORD_HASH,
    },
    {
        "name": "Arjun Mehta",
        "email": "arjun@projecthub.dev",
        "role": "Senior Engineer",
        "role_type": "team_member",
        "avatar_color": "#14B8A6",
        "password_hash": _DEV_PASSWORD_HASH,
    },
    {
        "name": "Priya Sharma",
        "email": "priya@projecthub.dev",
        "role": "Product Designer",
        "role_type": "team_member",
        "avatar_color": "#F472B6",
        "password_hash": _DEV_PASSWORD_HASH,
    },
    {
        "name": "Vikram Rao",
        "email": "vikram@projecthub.dev",
        "role": "Data Scientist",
        "role_type": "team_member",
        "avatar_color": "#A855F7",
        "password_hash": _DEV_PASSWORD_HASH,
    },
    {
        "name": "Lakshmi Nair",
        "email": "lakshmi@projecthub.dev",
        "role": "Engineering Manager",
        "role_type": "team_member",
        "avatar_color": "#F59E0B",
        "password_hash": _DEV_PASSWORD_HASH,
    },
]

_PROJECTS = [
    {
        "title": "API Gateway Modernization",
        "type": "engineering",
        "requirement": "Replace legacy nginx + custom auth with API Gateway + JWT.",
        "status": "active",
        "priority": "high",
        "current_phase": "Implementation",
        "timebox_days": 60,
    },
    {
        "title": "Customer Churn Prediction Model",
        "type": "research",
        "requirement": "Build a churn-risk classifier from the past 12mo of usage data.",
        "status": "active",
        "priority": "medium",
        "current_phase": "Hypothesis",
        "timebox_days": 90,
    },
]


def seed() -> None:
    """Run the seed. Idempotent — safe to invoke multiple times."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            # Users — INSERT ... ON CONFLICT DO NOTHING by email
            for u in _USERS:
                cur.execute(
                    """
                    INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                    VALUES (%(name)s, %(email)s, %(role)s, %(role_type)s, %(avatar_color)s, %(password_hash)s)
                    ON CONFLICT (email) DO NOTHING
                    """,
                    u,
                )

            # Look up the CEO id for project ownership
            cur.execute("SELECT id FROM users WHERE email = 'ceo@projecthub.dev'")
            ceo_row = cur.fetchone()
            ceo_id = ceo_row["id"] if ceo_row else None

            # Projects — INSERT only if title doesn't already exist
            for p in _PROJECTS:
                cur.execute(
                    "SELECT id FROM projects WHERE title = %s",
                    (p["title"],),
                )
                if cur.fetchone() is not None:
                    continue
                cur.execute(
                    """
                    INSERT INTO projects (title, type, requirement, status, priority, current_phase, timebox_days, created_by)
                    VALUES (%(title)s, %(type)s, %(requirement)s, %(status)s, %(priority)s, %(current_phase)s, %(timebox_days)s, %(created_by)s)
                    """,
                    {**p, "created_by": ceo_id},
                )

        conn.commit()


if __name__ == "__main__":
    from app.db import init_pool

    init_pool()
    seed()
    print("Seed complete.")
