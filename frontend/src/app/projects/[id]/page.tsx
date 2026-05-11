import { notFound } from "next/navigation";
import { apiServerFetch, ApiError } from "@/lib/api";
import { ProjectWorkspace } from "@/components/projects/workspace/project-workspace";
import type {
  ProjectWorkspaceData,
  AiPlan,
  SerializedPhase,
  SerializedTask,
  SerializedExtension,
  SerializedCheckpoint,
} from "@/components/projects/workspace/types";

// ── Hydrated shape from GET /api/v1/projects/{id} ────────────────────────────

type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: "ceo" | "team_member";
  avatar_color: string;
};

type HydratedAssignee = { user: PublicUser };

type HydratedPhase = {
  id: string;
  project_id: string;
  phase_name: string;
  status: "pending" | "active" | "completed";
  checklist: Array<{ label: string; done: boolean }>;
  order: number;
};

type HydratedTask = {
  id: string;
  project_id: string | null;
  phase_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "planning" | "in_progress" | "blocked" | "completed" | "killed";
  assignee: PublicUser | null;
  created_at: string;
  completed_at: string | null;
};

type HydratedFeedback = {
  id: string;
  submission_id: string;
  text: string;
  is_ai: boolean;
  from_user: PublicUser | null;
  created_at: string;
};

type HydratedSubmission = {
  id: string;
  phase_id: string | null;
  title: string;
  type: "document" | "code" | "architecture" | "notebook" | "demo";
  description: string | null;
  link: string | null;
  user: PublicUser | null;
  feedback: HydratedFeedback[];
  created_at: string;
};

type HydratedCheckpoint = {
  id: string;
  decision: "continue" | "kill";
  notes: string | null;
  created_at: string;
};

type HydratedProject = {
  id: string;
  title: string;
  type: "engineering" | "research";
  requirement: string | null;
  status: "active" | "completed" | "killed";
  priority: "low" | "medium" | "high" | "critical";
  current_phase: string | null;
  timebox_days: number | null;
  start_date: string | null;
  tech_stack: unknown;
  ai_plan: unknown;
  created_at: string;
  updated_at: string | null;
  assignees: HydratedAssignee[];
  phases: HydratedPhase[];
  tasks: HydratedTask[];
  submissions: HydratedSubmission[];
  checkpoints: HydratedCheckpoint[];
};

// ── Hydrated shape from GET /api/v1/deadline-extensions ──────────────────────

type HydratedExtension = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  requested_by_id: string;
  original_deadline: string;
  requested_deadline: string;
  reason: string | null;
  status: "pending" | "approved" | "rejected" | "auto_escalated";
  ceo_comment: string | null;
  approved_by_id: string | null;
  escalation_level: number;
  created_at: string;
  updated_at: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: "ceo" | "team_member";
  avatar_color: string;
};

// ─────────────────────────────────────────────────────────────────────────────

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let project: HydratedProject;
  try {
    project = await apiServerFetch<HydratedProject>(`/api/v1/projects/${id}`);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      notFound();
    }
    throw e;
  }

  // Extensions are now served by FastAPI; fetch alongside users for requester enrichment.
  const [extensionsRaw, usersList] = await Promise.all([
    apiServerFetch<HydratedExtension[]>(`/api/v1/deadline-extensions?project_id=${id}`),
    apiServerFetch<UserRow[]>("/api/v1/users"),
  ]);
  const userById = new Map(usersList.map(u => [u.id, u]));

  // Parse JSON fields that the backend may return as raw JSON strings
  let aiPlan: AiPlan = {};
  try {
    const raw = project.ai_plan;
    if (typeof raw === "string") aiPlan = JSON.parse(raw);
    else if (raw && typeof raw === "object") aiPlan = raw as AiPlan;
  } catch { /* ignore */ }

  let techStack: string[] = [];
  try {
    const raw = project.tech_stack;
    if (typeof raw === "string") techStack = JSON.parse(raw);
    else if (Array.isArray(raw)) techStack = raw as string[];
  } catch { /* ignore */ }

  // Backend returns submissions at the top level with phase_id pointing
  // to the owning phase. Group them so each phase carries its own subset.
  const submissionsByPhase = new Map<string, HydratedSubmission[]>();
  for (const s of project.submissions) {
    if (s.phase_id == null) continue;
    const list = submissionsByPhase.get(s.phase_id);
    if (list) list.push(s);
    else submissionsByPhase.set(s.phase_id, [s]);
  }

  const serializedPhases: SerializedPhase[] = project.phases.map(phase => ({
    id: phase.id,
    phaseName: phase.phase_name,
    status: phase.status,
    order: phase.order,
    // backend returns [{label, done}] — flatten to label strings for the UI
    checklist: phase.checklist.map(item => item.label),
    submissions: (submissionsByPhase.get(phase.id) ?? []).map(s => ({
      id: s.id,
      title: s.title,
      type: s.type,
      description: s.description ?? "",
      link: s.link ?? "",
      createdAt: s.created_at,
      user: s.user
        ? { id: s.user.id, name: s.user.name, avatarColor: s.user.avatar_color }
        : { id: "", name: "Unknown", avatarColor: "#888" },
      feedback: s.feedback.map(fb => ({
        id: fb.id,
        text: fb.text,
        isAi: fb.is_ai,
        createdAt: fb.created_at,
        fromUser: fb.from_user
          ? { id: fb.from_user.id, name: fb.from_user.name, avatarColor: fb.from_user.avatar_color }
          : { id: "", name: "Unknown", avatarColor: "#888" },
      })),
    })),
  }));

  const serializedTasks: SerializedTask[] = project.tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority,
    status: t.status,
    dueDate: t.due_date ?? null,
    completedAt: t.completed_at ?? null,
    assignee: t.assignee
      ? { id: t.assignee.id, name: t.assignee.name, avatarColor: t.assignee.avatar_color }
      : null,
  }));

  const serializedExtensions: SerializedExtension[] = extensionsRaw.map(e => {
    const requester = userById.get(e.requested_by_id);
    return {
      id: e.id,
      reason: e.reason ?? "",
      reasonDetail: e.reason ?? "",
      status: e.status,
      ceoComment: e.ceo_comment ?? "",
      originalDeadline: e.original_deadline,
      requestedDeadline: e.requested_deadline,
      escalationLevel: e.escalation_level,
      createdAt: e.created_at,
      task: null,
      requestedBy: requester
        ? { id: requester.id, name: requester.name, avatarColor: requester.avatar_color }
        : { id: e.requested_by_id, name: "Unknown", avatarColor: "#888" },
    };
  });

  const serializedCheckpoints: SerializedCheckpoint[] = project.checkpoints.map(c => ({
    id: c.id,
    decision: c.decision,
    notes: c.notes ?? "",
    createdAt: c.created_at,
  }));

  const data: ProjectWorkspaceData = {
    id: project.id,
    title: project.title,
    requirement: project.requirement ?? "",
    type: project.type,
    priority: project.priority,
    status: project.status,
    currentPhase: project.current_phase ?? "",
    startDate: project.start_date ?? new Date().toISOString(),
    timeboxDays: project.timebox_days ?? 0,
    techStack,
    aiPlan,
    phases: serializedPhases,
    checkpoints: serializedCheckpoints,
    assignees: project.assignees.map(a => ({
      user: { id: a.user.id, name: a.user.name, avatarColor: a.user.avatar_color },
    })),
    tasks: serializedTasks,
    extensions: serializedExtensions,
  };

  return <ProjectWorkspace data={data} />;
}
