import { prisma } from "@/lib/prisma";
import { getActionInbox, getPendingLeaveRequests, getActiveLeaves, getOverdueTasks, getPendingExtensions } from "@/lib/queries";
import { computeProjectProgress, computeDaysRemaining, computeKpis, generateHeuristicInsights } from "@/lib/command-center-data";
import { PageHeader, KPIStat, ProjectCard, EmptyState } from "@/components/primitives";
import { TodayWeekCard } from "./today-week-card";
import { ActionInboxClientRow, type SerializedInboxItem } from "./action-inbox-client-row";
import { InsightCardClient } from "./insight-card-client";
import { Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { ReviewInboxItem, CaptureInboxItem, ExtensionInboxItem } from "@/lib/queries/inbox";

function insightAction(title: string): { href: string; label: string } | undefined {
  if (title.includes("overdue")) return { href: "/projects", label: "View tasks" };
  if (title.includes("Escalated")) return { href: "/projects", label: "Review" };
  if (title.includes("leave")) return { href: "/team/availability", label: "View availability" };
  if (title.includes("submissions")) return { href: "/reviews", label: "Go to reviews" };
  return undefined;
}

export async function CeoCommandCenter({ userId, name }: { userId: string; name: string }) {
  const today = new Date();
  const weekEnd = new Date(today.getTime() + 7 * 86_400_000);

  const [
    inboxItems,
    pendingLeaves,
    activeLeavesToday,
    overdueTasks,
    pendingExtensions,
    activeProjects,
    tasksThisWeek,
    teamCount,
    completedCount,
  ] = await Promise.all([
    getActionInbox(userId),
    getPendingLeaveRequests(),
    getActiveLeaves(today),
    getOverdueTasks(),
    getPendingExtensions(),
    prisma.project.findMany({
      where: { status: "active" },
      select: {
        id: true, title: true, type: true, priority: true, status: true,
        startDate: true, timeboxDays: true, currentPhase: true,
        phases: { select: { status: true, phaseName: true, order: true }, orderBy: { order: "asc" } },
        assignees: { select: { user: { select: { name: true } } } },
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.task.findMany({
      where: { dueDate: { gte: today, lte: weekEnd }, status: { notIn: ["completed", "killed"] } },
      select: { id: true, title: true, dueDate: true },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    prisma.user.count({ where: { roleType: "team_member" } }),
    prisma.project.count({ where: { status: "completed" } }),
  ]);

  const upcomingLeaveCount = pendingLeaves.filter(l =>
    new Date(l.startDate) >= today && new Date(l.startDate) <= weekEnd
  ).length;

  const kpis = computeKpis({
    activeProjectCount: activeProjects.length,
    pendingInboxCount: inboxItems.length,
    completedProjectCount: completedCount,
    teamMemberCount: teamCount,
    overdueTaskCount: overdueTasks.length,
  });

  const insights = generateHeuristicInsights({
    overdueTaskCount: overdueTasks.length,
    pendingExtensions: pendingExtensions.map(e => ({ escalationLevel: e.escalationLevel, project: { title: e.project.title } })),
    upcomingLeaveCount,
    activeProjectCount: activeProjects.length,
    pendingInboxCount: inboxItems.length,
  });

  const serializedInbox: SerializedInboxItem[] = inboxItems.map(item => {
    const age = formatDistanceToNow(item.createdAt, { addSuffix: true });
    if (item.kind === "review") {
      const r = item as ReviewInboxItem;
      return { kind: "review", id: r.id, title: r.title, projectTitle: r.project.title, submitterName: r.submitter.name, age };
    }
    if (item.kind === "capture") {
      const c = item as CaptureInboxItem;
      return { kind: "capture", id: c.id, title: c.title, itemType: c.itemType, age };
    }
    const e = item as ExtensionInboxItem;
    return { kind: "extension", id: e.id, projectTitle: e.project.title, requesterName: e.requestedBy.name, daysRequested: e.daysRequested, age };
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
          tasksThisWeek={tasksThisWeek.map(t => ({ id: t.id, title: t.title, dueDate: t.dueDate! }))}
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
              const progress = computeProjectProgress(project.phases);
              const daysRemaining = computeDaysRemaining(project.startDate, project.timeboxDays);
              const activePhase = project.phases.find(p => p.status === "active") ?? project.phases[project.phases.length - 1];
              const phaseLabel = activePhase
                ? `${activePhase.phaseName} · Phase ${project.phases.findIndex(p => p.phaseName === activePhase.phaseName) + 1} of ${project.phases.length}`
                : project.currentPhase || "—";
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
                  assigneeNames={project.assignees.map(a => a.user.name)}
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
