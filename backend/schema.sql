-- ProjectHub backend canonical schema.
-- Source of truth: this file. Mirrored by migrations/versions/0001_initial.py.
-- First-time bootstrap: psql -f schema.sql
-- Steady state: alembic upgrade head

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================================
-- users
-- =====================================================================
CREATE TABLE IF NOT EXISTS users (
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

-- =====================================================================
-- projects
-- =====================================================================
CREATE TABLE IF NOT EXISTS projects (
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

CREATE INDEX IF NOT EXISTS idx_projects_status_created
    ON projects (status, created_at DESC);

-- =====================================================================
-- project_assignees (M:N users <-> projects)
-- =====================================================================
CREATE TABLE IF NOT EXISTS project_assignees (
    project_id  uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL REFERENCES users(id)    ON DELETE CASCADE,
    assigned_at timestamptz NOT NULL DEFAULT now(),
    PRIMARY KEY (project_id, user_id)
);

-- =====================================================================
-- phases
-- =====================================================================
CREATE TABLE IF NOT EXISTS phases (
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

-- =====================================================================
-- tasks
-- =====================================================================
CREATE TABLE IF NOT EXISTS tasks (
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

CREATE INDEX IF NOT EXISTS idx_tasks_assignee_status ON tasks (assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_tasks_project_phase  ON tasks (project_id, phase_id);

-- =====================================================================
-- submissions
-- =====================================================================
CREATE TABLE IF NOT EXISTS submissions (
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

CREATE INDEX IF NOT EXISTS idx_submissions_project_created ON submissions (project_id, created_at DESC);

-- =====================================================================
-- feedback
-- =====================================================================
CREATE TABLE IF NOT EXISTS feedback (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    submission_id uuid NOT NULL REFERENCES submissions(id) ON DELETE CASCADE,
    from_user_id  uuid REFERENCES users(id),
    text          text NOT NULL,
    is_ai         boolean NOT NULL DEFAULT false,
    created_at    timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- checkpoints
-- =====================================================================
CREATE TABLE IF NOT EXISTS checkpoints (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    decision   text NOT NULL CHECK (decision IN ('continue', 'kill')),
    notes      text,
    created_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================================
-- leave_requests
-- =====================================================================
CREATE TABLE IF NOT EXISTS leave_requests (
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

CREATE INDEX IF NOT EXISTS idx_leave_requests_user_status ON leave_requests (user_id, status);

-- =====================================================================
-- deadline_extensions
-- =====================================================================
CREATE TABLE IF NOT EXISTS deadline_extensions (
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

-- =====================================================================
-- capture_sessions
-- =====================================================================
CREATE TABLE IF NOT EXISTS capture_sessions (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    raw_input  text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_capture_sessions_user_created ON capture_sessions (user_id, created_at DESC);

-- =====================================================================
-- capture_items
-- =====================================================================
CREATE TABLE IF NOT EXISTS capture_items (
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

-- =====================================================================
-- capture_item_assignees
-- =====================================================================
CREATE TABLE IF NOT EXISTS capture_item_assignees (
    item_id uuid NOT NULL REFERENCES capture_items(id) ON DELETE CASCADE,
    user_id uuid NOT NULL REFERENCES users(id)         ON DELETE CASCADE,
    PRIMARY KEY (item_id, user_id)
);
