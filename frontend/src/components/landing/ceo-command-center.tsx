import { apiServerFetch } from "@/lib/api";
import { computeDaysRemaining, computeKpis, generateHeuristicInsights } from "@/lib/command-center-data";
import { PageHeader, KPIStat, ProjectCard, EmptyState } from "@/components/primitives";
import { TodayWeekCard } from "./today-week-card";
import { ActionInboxClientRow, type SerializedInboxItem } from "./action-inbox-client-row";
import { InsightCardClient } from "./insight-card-client";
import { Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { InboxLeave, InboxExtension, InboxReview, InboxCapture } from "@/app/(app)/page";

// ── Backend response types ────────────────────────────────────────────────────

type BackendUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: string;
  avatar_color: string;
};

type BackendProject = {
  id: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  current_phase: string | null;
  timebox_days: number;
  start_date: string | null;
  progress: number;
  assignees: BackendUser[];
  created_at: string | null;
};

type BackendTask = {
  id: string;
  project_id: string | null;
  phase_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

type BackendLeave = {
  id: string;
  user_id: string;
  type: string;
  start_date: string | null;
  end_date: string | null;
  days: number | null;
  reason: string | null;
  status: string;
  approved_by_id: string | null;
  cover_person_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function insightAction(title: string): { href: string; label: string } | undefined {
  if (title.includes("overdue")) return { href: "/projects", label: "View tasks" };
  if (title.includes("Escalated")) return { href: "/projects", label: "Review" };
  if (title.includes("leave")) return { href: "/team/availability", label: "View availability" };
  if (title.includes("submissions")) return { href: "/reviews", label: "Go to reviews" };
  return undefined;
}

const PRIORITY_WEIGHT: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
const ageScore = (createdAt: string) => (Date.now() - new Date(createdAt).getTime()) / 86_400_000;

type LocalInbox =
  | { kind: "review"; id: string; title: string; projectTitle: string; submitterName: string; createdAt: string; urgency: number }
  | { kind: "capture"; id: string; title: string; itemType: string; createdAt: string; urgency: number }
  | { kind: "extension"; id: string; projectTitle: string; requesterName: string; daysRequested: number; createdAt: string; urgency: number };

// ── Props ─────────────────────────────────────────────────────────────────────

interface CeoCommandCenterProps {
  userId: string;
  name: string;
  pendingLeaves: InboxLeave[];
  pendingExtensions: InboxExtension[];
  pendingReviews: InboxReview[];
  pendingCaptures: InboxCapture[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export async function CeoCommandCenter({
  userId: _userId,
  name,
  pendingLeaves,
  pendingExtensions,
  pendingReviews,
  pendingCaptures,
}: CeoCommandCenterProps) {
  const today = new Date();
  const weekEnd = new Date(today.getTime() + 7 * 86_400_000);

  const [allUsers, allProjects, allTasks, allLeaves] = await Promise.all([
    apiServerFetch<BackendUser[]>("/api/v1/users"),
    apiServerFetch<BackendProject[]>("/api/v1/projects"),
    apiServerFetch<BackendTask[]>("/api/v1/tasks"),
    apiServerFetch<BackendLeave[]>("/api/v1/leaves?status=approved"),
  ]);

  // ── Derived data ────────────────────────────────────────────────────────────

  // Active projects: top 10 DESC by created_at (backend already returns DESC)
  const activeProjects = allProjects
    .filter(p => p.status === "active")
    .slice(0, 10);

  // Counts
  const teamCount = allUsers.filter(u => u.role_type === "team_member").length;
  const completedCount = allProjects.filter(p => p.status === "completed").length;

  // Tasks this week: due_date in [now, now+7d], not completed/killed, top 5 ASC
  const tasksThisWeek = allTasks
    .filter(t => {
      if (!t.due_date) return false;
      if (t.status === "completed" || t.status === "killed") return false;
      const d = new Date(t.due_date).getTime();
      return d >= today.getTime() && d <= weekEnd.getTime();
    })
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())
    .slice(0, 5);

  // Overdue tasks: due_date < now, not completed/killed
  const overdueTasks = allTasks.filter(t => {
    if (!t.due_date) return false;
    if (t.status === "completed" || t.status === "killed") return false;
    return new Date(t.due_date).getTime() < today.getTime();
  });

  // Active leaves today: approved (already filtered by query), today ∈ [start, end]
  const userById = new Map(allUsers.map(u => [u.id, u]));
  const activeLeavesToday = allLeaves
    .filter(l => {
      if (!l.start_date || !l.end_date) return false;
      const start = new Date(l.start_date).getTime();
      const end = new Date(l.end_date).getTime();
      return start <= today.getTime() && today.getTime() <= end;
    })
    .map(l => {
      const u = userById.get(l.user_id);
      return { user: { name: u?.name ?? "(unknown)" } };
    });

  // Upcoming leave count from pending leaves props (status=pending), within next 7 days
  const upcomingLeaveCount = pendingLeaves.filter(l =>
    new Date(l.start_date) >= today && new Date(l.start_date) <= weekEnd
  ).length;

  // ── Inbox: build, score, sort ───────────────────────────────────────────────

  const reviewItems: LocalInbox[] = pendingReviews.map(r => ({
    kind: "review",
    id: r.id,
    title: r.title,
    projectTitle: r.project.title,
    submitterName: r.submitter.name,
    createdAt: r.created_at,
    urgency: 2 + ageScore(r.created_at),
  }));

  const captureItems: LocalInbox[] = pendingCaptures.map(c => ({
    kind: "capture",
    id: c.id,
    title: c.title,
    itemType: c.item_type,
    createdAt: c.created_at,
    urgency: (PRIORITY_WEIGHT[c.priority] ?? 2) + ageScore(c.created_at),
  }));

  const extensionItems: LocalInbox[] = pendingExtensions.map(e => {
    const daysRequested = Math.round(
      (new Date(e.requested_deadline).getTime() - new Date(e.original_deadline).getTime()) / 86_400_000
    );
    return {
      kind: "extension",
      id: e.id,
      projectTitle: e.project_title ?? "(unknown)",
      requesterName: e.requested_by.name,
      daysRequested,
      createdAt: e.created_at,
      urgency: 3 + e.escalation_level * 2 + ageScore(e.created_at),
    };
  });

  const allInbox = [...reviewItems, ...captureItems, ...extensionItems].sort(
    (a, b) => b.urgency - a.urgency || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const serializedInbox: SerializedInboxItem[] = allInbox.map(item => {
    const age = formatDistanceToNow(new Date(item.createdAt), { addSuffix: true });
    if (item.kind === "review") return { kind: "review", id: item.id, title: item.title, projectTitle: item.projectTitle, submitterName: item.submitterName, age };
    if (item.kind === "capture") return { kind: "capture", id: item.id, title: item.title, itemType: item.itemType, age };
    return { kind: "extension", id: item.id, projectTitle: item.projectTitle, requesterName: item.requesterName, daysRequested: item.daysRequested, age };
  });

  // ── KPIs + Insights ─────────────────────────────────────────────────────────

  const kpis = computeKpis({
    activeProjectCount: activeProjects.length,
    pendingInboxCount: allInbox.length,
    completedProjectCount: completedCount,
    teamMemberCount: teamCount,
    overdueTaskCount: overdueTasks.length,
  });

  const insights = generateHeuristicInsights({
    overdueTaskCount: overdueTasks.length,
    pendingExtensions: pendingExtensions.map(e => ({
      escalationLevel: e.escalation_level,
      project: { title: e.project_title ?? "" },
    })),
    upcomingLeaveCount,
    activeProjectCount: activeProjects.length,
    pendingInboxCount: allInbox.length,
  });

  const dateLabel = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  return (
    <div className="space-y-8">
      {/* Header */}
      <PageHeader title={`Good morning, ${name}.`} description={dateLabel} />

      {/* KPI row + Today/Week card */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_288px]">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KPIStat label="Active Projects" value={kpis.active.value} delta={kpis.active.delta} tone={kpis.active.tone} />
          <KPIStat label="Pending Reviews" value={kpis.pendingReviews.value} delta={kpis.pendingReviews.delta} tone={kpis.pendingReviews.tone} />
          <KPIStat label="Completed" value={kpis.completed.value} delta={kpis.completed.delta} />
          <KPIStat label="Team Members" value={kpis.team.value} />
        </div>
        <TodayWeekCard
          activeLeavesToday={activeLeavesToday.map(l => ({ userName: l.user.name }))}
          upcomingLeaveCount={upcomingLeaveCount}
          tasksThisWeek={tasksThisWeek.map(t => ({ id: t.id, title: t.title, dueDate: new Date(t.due_date!) }))}
        />
      </div>

      {/* Inbox + Insights */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Action Inbox
            {serializedInbox.length > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">{serializedInbox.length}</span>
            )}
          </h2>
          {serializedInbox.length === 0 ? (
            <EmptyState icon={Inbox} title="Inbox clear" description="Nothing pending right now." />
          ) : (
            <div className="space-y-2">
              {serializedInbox.map(item => <ActionInboxClientRow key={item.id} item={item} />)}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            AI Insights
            {insights.length > 0 && (
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] font-bold text-accent-fg">{insights.length}</span>
            )}
          </h2>
          {insights.length === 0 ? (
            <EmptyState icon={Inbox} title="No insights" description="All looking good." />
          ) : (
            <div className="space-y-2">
              {insights.map((insight, i) => {
                const action = insightAction(insight.title);
                return <InsightCardClient key={i} {...insight} actionHref={action?.href} actionLabel={action?.label} />;
              })}
            </div>
          )}
        </section>
      </div>

      {/* Active Projects strip */}
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Active Projects</h2>
        {activeProjects.length === 0 ? (
          <EmptyState icon={Inbox} title="No active projects" />
        ) : (
          <div className="flex gap-4 overflow-x-auto pb-2">
            {activeProjects.map(project => {
              const progress = project.progress;
              const daysRemaining = computeDaysRemaining(new Date(project.start_date ?? Date.now()), project.timebox_days);
              const phaseLabel = project.current_phase || "—";
              return (
                <ProjectCard
                  key={project.id}
                  href={`/projects/${project.id}`}
                  title={project.title}
                  type={project.type}
                  priority={project.priority as "low" | "medium" | "high" | "critical"}
                  status="active"
                  phaseLabel={phaseLabel}
                  progress={progress}
                  daysRemaining={daysRemaining}
                  assignees={project.assignees.map(a => ({ name: a.name, avatarColor: a.avatar_color }))}
                  className="w-72 shrink-0"
                />
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
