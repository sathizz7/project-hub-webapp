import type { InsightSeverity } from "@/components/primitives/insight-card";

// ── computeProjectProgress ──────────────────────────────────────────────────
export function computeProjectProgress(phases: { status: string }[]): number {
  if (phases.length === 0) return 0;
  const completed = phases.filter(p => p.status === "completed").length;
  return Math.round((completed / phases.length) * 100);
}

// ── computeDaysRemaining ────────────────────────────────────────────────────
export function computeDaysRemaining(startDate: Date, timeboxDays: number): number {
  const endMs = startDate.getTime() + timeboxDays * 86_400_000;
  return Math.ceil((endMs - Date.now()) / 86_400_000);
}

// ── computeKpis ─────────────────────────────────────────────────────────────
export type KpiInput = {
  activeProjectCount: number;
  pendingInboxCount: number;
  completedProjectCount: number;
  teamMemberCount: number;
  overdueTaskCount: number;
};

export type KpiShape = {
  value: number;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  tone?: "default" | "danger";
};

export type CommandCenterKpis = {
  active: KpiShape;
  pendingReviews: KpiShape;
  completed: KpiShape;
  team: KpiShape;
};

export function computeKpis(input: KpiInput): CommandCenterKpis {
  const { activeProjectCount, pendingInboxCount, completedProjectCount, teamMemberCount, overdueTaskCount } = input;
  return {
    active: { value: activeProjectCount },
    pendingReviews: {
      value: pendingInboxCount,
      tone: overdueTaskCount > 0 ? "danger" : "default",
      ...(overdueTaskCount > 0 ? { delta: { value: `${overdueTaskCount} overdue`, direction: "down" as const } } : {}),
    },
    completed: { value: completedProjectCount },
    team: { value: teamMemberCount },
  };
}

// ── generateHeuristicInsights ───────────────────────────────────────────────
export type InsightData = {
  severity: InsightSeverity;
  title: string;
  description: string;
};

export type HeuristicInput = {
  overdueTaskCount: number;
  pendingExtensions: { escalationLevel: number; project: { title: string } }[];
  upcomingLeaveCount: number;
  activeProjectCount: number;
  pendingInboxCount: number;
};

export function generateHeuristicInsights(input: HeuristicInput): InsightData[] {
  const { overdueTaskCount, pendingExtensions, upcomingLeaveCount, activeProjectCount, pendingInboxCount } = input;
  const insights: InsightData[] = [];

  // Rule 1 — overdue tasks → risk
  if (overdueTaskCount > 0) {
    const plural = overdueTaskCount === 1 ? "" : "s";
    insights.push({ severity: "risk", title: `${overdueTaskCount} overdue task${plural}`, description: "Tasks past their deadline across active projects" });
  }

  // Rule 2 — escalated extension → blocker
  const escalated = pendingExtensions.find(e => e.escalationLevel >= 2);
  if (escalated) {
    insights.push({ severity: "blocker", title: "Escalated deadline request", description: `${escalated.project.title} has a repeated extension request` });
  }

  // Rule 3 — upcoming leaves with active projects → risk
  if (upcomingLeaveCount > 0 && activeProjectCount > 0) {
    const plural = upcomingLeaveCount === 1 ? "" : "s";
    insights.push({ severity: "risk", title: `${upcomingLeaveCount} team member${plural} on leave this week`, description: "Review project coverage before they go" });
  }

  // Rule 4 — suggestion (always, if still under 4)
  if (insights.length < 4) {
    const plural = pendingInboxCount === 1 ? "" : "s";
    insights.push({ severity: "suggestion", title: "Review pending submissions", description: `${pendingInboxCount} submission${plural} awaiting your feedback` });
  }

  return insights.slice(0, 4);
}
