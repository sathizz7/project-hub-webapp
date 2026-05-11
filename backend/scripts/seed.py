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
            # 1. Users — INSERT ... ON CONFLICT DO NOTHING by email
            for u in _USERS:
                cur.execute(
                    """
                    INSERT INTO users (name, email, role, role_type, avatar_color, password_hash)
                    VALUES (%(name)s, %(email)s, %(role)s, %(role_type)s, %(avatar_color)s, %(password_hash)s)
                    ON CONFLICT (email) DO NOTHING
                    """,
                    u,
                )

            # 2. Look up everyone we care about by email
            cur.execute(
                "SELECT id, email FROM users WHERE email = ANY(%s)",
                ([u["email"] for u in _USERS],),
            )
            users_by_email = {row["email"]: str(row["id"]) for row in cur.fetchall()}
            ceo_id = users_by_email["ceo@projecthub.dev"]
            team_emails = [u["email"] for u in _USERS if u["role_type"] == "team_member"]
            team_ids = [users_by_email[e] for e in team_emails]

            # 3. Projects — insert if absent; capture the id for each project title
            project_ids: dict[str, str] = {}
            for p in _PROJECTS:
                proj_title_key: str = str(p["title"])
                cur.execute("SELECT id FROM projects WHERE title = %s", (proj_title_key,))
                row = cur.fetchone()
                if row is not None:
                    project_ids[proj_title_key] = str(row["id"])
                    continue
                cur.execute(
                    """
                    INSERT INTO projects (title, type, requirement, status, priority, current_phase, timebox_days, created_by)
                    VALUES (%(title)s, %(type)s, %(requirement)s, %(status)s, %(priority)s, %(current_phase)s, %(timebox_days)s, %(created_by)s)
                    RETURNING id
                    """,
                    {**p, "created_by": ceo_id},
                )
                inserted = cur.fetchone()
                assert inserted is not None
                project_ids[proj_title_key] = str(inserted["id"])

            # 4. Assignees — CEO + every team member on every project (idempotent)
            for pid in project_ids.values():
                for uid in [ceo_id, *team_ids]:
                    cur.execute(
                        """
                        INSERT INTO project_assignees (project_id, user_id)
                        VALUES (%s, %s) ON CONFLICT DO NOTHING
                        """,
                        (pid, uid),
                    )

            # 5. Phases — small set per project (idempotent via project_id + order unique key)
            _PHASE_TEMPLATES = {
                "engineering": [
                    {"phase_name": "Requirements", "status": "completed"},
                    {"phase_name": "Design", "status": "completed"},
                    {"phase_name": "Implementation", "status": "active"},
                    {"phase_name": "Testing", "status": "pending"},
                    {"phase_name": "Deployment", "status": "pending"},
                ],
                "research": [
                    {"phase_name": "Hypothesis", "status": "active"},
                    {"phase_name": "Data Collection", "status": "pending"},
                    {"phase_name": "Modeling", "status": "pending"},
                    {"phase_name": "Evaluation", "status": "pending"},
                    {"phase_name": "Report", "status": "pending"},
                ],
            }
            for proj in _PROJECTS:
                pid = project_ids[str(proj["title"])]
                template = _PHASE_TEMPLATES[str(proj["type"])]
                for i, ph in enumerate(template):
                    cur.execute(
                        """
                        INSERT INTO phases (project_id, phase_name, status, checklist, "order")
                        VALUES (%s, %s, %s, '[]'::jsonb, %s)
                        ON CONFLICT (project_id, "order") DO NOTHING
                        """,
                        (pid, ph["phase_name"], ph["status"], i),
                    )

            # 6. Sample tasks — a handful per project, distributed across team members
            _SAMPLE_TASKS = {
                "API Gateway Modernization": [
                    ("Draft API contracts", "arjun@projecthub.dev", "high", "in_progress"),
                    ("Wireframe admin UI", "priya@projecthub.dev", "medium", "in_progress"),
                    ("Set up JWT signing service", "arjun@projecthub.dev", "high", "completed"),
                    ("Performance benchmarks", "lakshmi@projecthub.dev", "low", "planning"),
                ],
                "Customer Churn Prediction Model": [
                    ("Pull last 12mo usage data", "vikram@projecthub.dev", "high", "completed"),
                    ("Feature engineering", "vikram@projecthub.dev", "high", "in_progress"),
                    ("Stakeholder review of features", "lakshmi@projecthub.dev", "medium", "planning"),
                ],
            }
            for proj_title, tasks in _SAMPLE_TASKS.items():
                pid = project_ids[proj_title]
                for title, assignee_email, priority, status in tasks:
                    cur.execute(
                        "SELECT id FROM tasks WHERE project_id = %s AND title = %s",
                        (pid, title),
                    )
                    if cur.fetchone() is not None:
                        continue
                    assignee_id = users_by_email[assignee_email]
                    if status == "completed":
                        cur.execute(
                            """
                            INSERT INTO tasks (project_id, assignee_id, title, priority, status, completed_at)
                            VALUES (%s, %s, %s, %s, %s, now())
                            """,
                            (pid, assignee_id, title, priority, status),
                        )
                    else:
                        cur.execute(
                            """
                            INSERT INTO tasks (project_id, assignee_id, title, priority, status, completed_at)
                            VALUES (%s, %s, %s, %s, %s, NULL)
                            """,
                            (pid, assignee_id, title, priority, status),
                        )

            # 7. Sample submissions — one per project authored by a team member
            _SAMPLE_SUBMISSIONS = {
                "API Gateway Modernization": (
                    "Initial JWT design doc",
                    "document",
                    "arjun@projecthub.dev",
                    "Drafted the JWT layout, claim structure, and rotation strategy.",
                    "https://example.com/jwt-design",
                ),
                "Customer Churn Prediction Model": (
                    "EDA notebook v1",
                    "notebook",
                    "vikram@projecthub.dev",
                    "First pass at exploratory analysis of usage features.",
                    "https://example.com/eda-nb",
                ),
            }
            for proj_title, (title, type_, author_email, desc, link) in _SAMPLE_SUBMISSIONS.items():
                pid = project_ids[proj_title]
                cur.execute(
                    "SELECT id FROM submissions WHERE project_id = %s AND title = %s",
                    (pid, title),
                )
                if cur.fetchone() is not None:
                    continue
                cur.execute(
                    """
                    INSERT INTO submissions (project_id, user_id, title, type, description, link)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (pid, users_by_email[author_email], title, type_, desc, link),
                )

        conn.commit()


if __name__ == "__main__":
    from app.db import init_pool

    init_pool()
    seed()
    print("Seed complete.")
