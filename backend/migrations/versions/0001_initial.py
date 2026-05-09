"""initial schema — 13 tables + indexes + pgcrypto

Revision ID: 0001
Revises:
Create Date: 2026-05-09

"""

from typing import Sequence, Union

from alembic import op


revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")

    op.execute("""
        CREATE TABLE users (
            id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            name          text NOT NULL,
            email         text NOT NULL UNIQUE,
            role          text NOT NULL,
            role_type     text NOT NULL CHECK (role_type IN ('ceo', 'team_member')),
            avatar_color  text NOT NULL,
            password_hash text NOT NULL,
            created_at    timestamptz NOT NULL DEFAULT now(),
            updated_at    timestamptz
        );
    """)

    op.execute("""
        CREATE TABLE projects (
            id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            title          text NOT NULL,
            type           text NOT NULL CHECK (type IN ('engineering', 'research')),
            requirement    text,
            status         text NOT NULL CHECK (status IN ('active', 'completed', 'killed')),
            priority       text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            current_phase  text,
            timebox_days   int,
            start_date     timestamptz,
            tech_stack     jsonb,
            ai_plan        jsonb,
            created_by     uuid REFERENCES users(id),
            created_at     timestamptz NOT NULL DEFAULT now(),
            updated_at     timestamptz
        );
    """)
    op.execute("CREATE INDEX idx_projects_status_created ON projects (status, created_at DESC);")

    op.execute("""
        CREATE TABLE project_assignees (
            project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            user_id     uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
            assigned_at timestamptz NOT NULL DEFAULT now(),
            PRIMARY KEY (project_id, user_id)
        );
    """)

    op.execute("""
        CREATE TABLE phases (
            id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            phase_name text NOT NULL,
            status     text NOT NULL CHECK (status IN ('pending', 'active', 'completed')),
            checklist  jsonb NOT NULL DEFAULT '[]'::jsonb,
            "order"    int NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now(),
            updated_at timestamptz,
            UNIQUE (project_id, "order")
        );
    """)

    op.execute("""
        CREATE TABLE tasks (
            id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id   uuid REFERENCES projects(id) ON DELETE CASCADE,
            phase_id     uuid REFERENCES phases(id)   ON DELETE SET NULL,
            assignee_id  uuid REFERENCES users(id)    ON DELETE SET NULL,
            title        text NOT NULL,
            description  text,
            due_date     timestamptz,
            priority     text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            status       text NOT NULL CHECK (status IN ('planning', 'in_progress', 'blocked', 'completed', 'killed')),
            created_at   timestamptz NOT NULL DEFAULT now(),
            updated_at   timestamptz,
            completed_at timestamptz
        );
    """)
    op.execute("CREATE INDEX idx_tasks_assignee_status ON tasks (assignee_id, status);")
    op.execute("CREATE INDEX idx_tasks_project_phase ON tasks (project_id, phase_id);")

    op.execute("""
        CREATE TABLE submissions (
            id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            phase_id    uuid REFERENCES phases(id) ON DELETE SET NULL,
            project_id  uuid REFERENCES projects(id) ON DELETE CASCADE,
            user_id     uuid NOT NULL REFERENCES users(id),
            title       text NOT NULL,
            type        text NOT NULL CHECK (type IN ('document', 'code', 'architecture', 'notebook', 'demo')),
            description text,
            link        text,
            created_at  timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_submissions_project_created ON submissions (project_id, created_at DESC);")

    op.execute("""
        CREATE TABLE feedback (
            id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
            from_user_id  uuid REFERENCES users(id),
            text          text NOT NULL,
            is_ai         boolean NOT NULL DEFAULT false,
            created_at    timestamptz NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE checkpoints (
            id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
            decision   text NOT NULL CHECK (decision IN ('continue', 'kill')),
            notes      text,
            created_by uuid REFERENCES users(id),
            created_at timestamptz NOT NULL DEFAULT now()
        );
    """)

    op.execute("""
        CREATE TABLE leave_requests (
            id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            type            text NOT NULL CHECK (type IN ('planned', 'sick', 'personal', 'wfh', 'half_day')),
            start_date      date NOT NULL,
            end_date        date NOT NULL,
            days            numeric(4,1) NOT NULL,
            reason          text,
            status          text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
            approved_by_id  uuid REFERENCES users(id),
            cover_person_id uuid REFERENCES users(id),
            created_at      timestamptz NOT NULL DEFAULT now(),
            updated_at      timestamptz
        );
    """)
    op.execute("CREATE INDEX idx_leave_requests_user_status ON leave_requests (user_id, status);")

    op.execute("""
        CREATE TABLE deadline_extensions (
            id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            project_id         uuid REFERENCES projects(id) ON DELETE CASCADE,
            task_id            uuid REFERENCES tasks(id) ON DELETE CASCADE,
            requested_by_id    uuid NOT NULL REFERENCES users(id),
            original_deadline  timestamptz NOT NULL,
            requested_deadline timestamptz NOT NULL,
            reason             text,
            status             text NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'auto_escalated')),
            ceo_comment        text,
            approved_by_id     uuid REFERENCES users(id),
            escalation_level   int NOT NULL DEFAULT 0,
            created_at         timestamptz NOT NULL DEFAULT now(),
            updated_at         timestamptz
        );
    """)

    op.execute("""
        CREATE TABLE capture_sessions (
            id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            raw_input  text NOT NULL,
            created_at timestamptz NOT NULL DEFAULT now()
        );
    """)
    op.execute("CREATE INDEX idx_capture_sessions_user_created ON capture_sessions (user_id, created_at DESC);")

    op.execute("""
        CREATE TABLE capture_items (
            id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            session_id        uuid NOT NULL REFERENCES capture_sessions(id) ON DELETE CASCADE,
            type              text NOT NULL CHECK (type IN ('todo', 'follow_up', 'commitment', 'meeting', 'review', 'timeline')),
            raw_text          text,
            title             text NOT NULL,
            description       text,
            department        text,
            due_date          timestamptz,
            priority          text NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
            status            text NOT NULL CHECK (status IN ('pending', 'converted', 'dismissed')),
            project_id        uuid REFERENCES projects(id) ON DELETE SET NULL,
            converted_to_type text,
            converted_to_id   uuid,
            created_at        timestamptz NOT NULL DEFAULT now(),
            updated_at        timestamptz
        );
    """)

    op.execute("""
        CREATE TABLE capture_item_assignees (
            item_id uuid NOT NULL REFERENCES capture_items(id) ON DELETE CASCADE,
            user_id uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
            PRIMARY KEY (item_id, user_id)
        );
    """)


def downgrade() -> None:
    # Reverse-dependency order
    op.execute("DROP TABLE IF EXISTS capture_item_assignees;")
    op.execute("DROP TABLE IF EXISTS capture_items;")
    op.execute("DROP TABLE IF EXISTS capture_sessions;")
    op.execute("DROP TABLE IF EXISTS deadline_extensions;")
    op.execute("DROP TABLE IF EXISTS leave_requests;")
    op.execute("DROP TABLE IF EXISTS checkpoints;")
    op.execute("DROP TABLE IF EXISTS feedback;")
    op.execute("DROP TABLE IF EXISTS submissions;")
    op.execute("DROP TABLE IF EXISTS tasks;")
    op.execute("DROP TABLE IF EXISTS phases;")
    op.execute("DROP TABLE IF EXISTS project_assignees;")
    op.execute("DROP TABLE IF EXISTS projects;")
    op.execute("DROP TABLE IF EXISTS users;")
    # Leave pgcrypto extension in place — other revisions may rely on it
