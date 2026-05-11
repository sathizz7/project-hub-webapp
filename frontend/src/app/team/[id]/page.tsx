import { notFound } from "next/navigation";
import { apiServerFetch, ApiError } from "@/lib/api";
import { computePerformanceMetrics } from "@/lib/performance";
import { deriveDepartment, type SerializedMember, type SerializedLeaveRequest } from "@/lib/team-helpers";
import { MemberProfile } from "@/components/team/member-profile";

// ---------------------------------------------------------------------------
// Backend response types (snake_case)
// ---------------------------------------------------------------------------

type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: string;
  avatar_color: string;
};

type BackendProjectAssignee = {
  id: string;
  name: string;
  role: string;
  email: string;
  role_type: string;
  avatar_color: string;
};

type BackendProject = {
  id: string;
  title: string;
  type: string;
  status: string;
  current_phase: string;
  assignees: BackendProjectAssignee[];
};

type BackendTask = {
  id: string;
  title: string;
  priority: string;
  status: string;
  due_date: string | null;
  project_id: string | null;
};

type BackendLeave = {
  id: string;
  user_id: string;
  approved_by_id: string | null;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
};

type BackendSubmissionFeedback = {
  id: string;
  submission_id: string;
  from_user_id: string | null;
  text: string;
  is_ai: boolean;
  created_at: string;
};

type BackendSubmissionWithFeedback = {
  id: string;
  title: string;
  type: string;
  created_at: string;
  project: { id: string; title: string; requirement?: string } | null;
  phase: { id: string; phase_name: string } | null;
  feedback: BackendSubmissionFeedback[];
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Fetch user separately so we can catch 404 and call notFound()
  let user: BackendUser;
  try {
    user = await apiServerFetch<BackendUser>(`/api/v1/users/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      notFound();
    }
    throw err;
  }

  // Parallel fetch of everything else
  const [allUsers, allProjects, tasks, leaves, recentSubsRaw, perf] = await Promise.all([
    apiServerFetch<BackendUser[]>(`/api/v1/users`),
    apiServerFetch<BackendProject[]>(`/api/v1/projects`),
    apiServerFetch<BackendTask[]>(`/api/v1/tasks?assignee_id=${id}`),
    apiServerFetch<BackendLeave[]>(`/api/v1/leaves?user_id=${id}&status=approved`),
    apiServerFetch<BackendSubmissionWithFeedback[]>(
      `/api/v1/submissions?user_id=${id}&include=project,phase,feedback`
    ),
    computePerformanceMetrics(id),
  ]);

  // ---------------------------------------------------------------------------
  // Client-side joins / lookup maps
  // ---------------------------------------------------------------------------

  const userById = new Map(allUsers.map(u => [u.id, u]));
  const projectById = new Map(allProjects.map(p => [p.id, p]));

  // Active projects: where this user is an assignee AND status === "active"
  const activeProjects = allProjects
    .filter(p => p.status === "active" && p.assignees.some(a => a.id === id))
    .map(p => ({
      id: p.id,
      title: p.title,
      type: p.type,
      status: p.status,
      currentPhase: p.current_phase,
    }));

  // Tasks — sort by dueDate asc (nulls last), mirror Prisma orderBy
  const mappedTasks = tasks
    .sort((a, b) => {
      if (a.due_date && b.due_date) {
        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
      }
      if (a.due_date) return -1;
      if (b.due_date) return 1;
      return 0;
    })
    .map(t => {
      const project = t.project_id ? projectById.get(t.project_id) : null;
      return {
        id: t.id,
        title: t.title,
        priority: t.priority as "low" | "medium" | "high" | "critical",
        status: t.status,
        dueDate: t.due_date,
        project: project
          ? { id: project.id, title: project.title, type: project.type }
          : { id: "", title: "(no project)", type: "engineering" },
      };
    });

  // Leaves — filter to upcoming 365 days from now, sort by startDate asc
  const now = Date.now();
  const horizon = now + 365 * 86400000;
  const serializedLeaves: SerializedLeaveRequest[] = leaves
    .filter(l => {
      const start = new Date(l.start_date).getTime();
      return start >= now && start <= horizon;
    })
    .sort((a, b) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
    .map(l => {
      const userRow = userById.get(l.user_id);
      const approverRow = l.approved_by_id ? userById.get(l.approved_by_id) : null;
      return {
        id: l.id,
        type: l.type,
        startDate: l.start_date,
        endDate: l.end_date,
        days: l.days,
        reason: l.reason ?? "",
        status: l.status,
        coveragePlan: "",       // not modeled in backend schema yet — deferred
        contingencyNote: "",    // same
        createdAt: l.created_at,
        user: userRow
          ? { id: userRow.id, name: userRow.name, avatarColor: userRow.avatar_color, role: userRow.role }
          : { id: l.user_id, name: "(unknown)", avatarColor: "#888", role: "" },
        approvedBy: approverRow ? { id: approverRow.id, name: approverRow.name } : null,
      };
    });

  // Recent submissions — backend returns DESC sort; take top 5, compute feedbackCount
  const recentSubmissions = recentSubsRaw.slice(0, 5).map(s => ({
    id: s.id,
    title: s.title,
    type: s.type,
    createdAt: s.created_at,
    project: s.project
      ? { id: s.project.id, title: s.project.title }
      : { id: "", title: "(unknown)" },
    phase: { phaseName: s.phase?.phase_name ?? "(unknown)" },
    feedbackCount: s.feedback.length,
  }));

  // Member
  const member: SerializedMember = {
    id: user.id,
    name: user.name,
    role: user.role,
    email: user.email,
    avatarColor: user.avatar_color,
    department: deriveDepartment(user.role),
    activeProjectCount: activeProjects.length,
    performance: perf,
  };

  return (
    <MemberProfile
      data={{
        member,
        activeProjects,
        tasks: mappedTasks,
        recentSubmissions,
        leaves: serializedLeaves,
      }}
    />
  );
}
