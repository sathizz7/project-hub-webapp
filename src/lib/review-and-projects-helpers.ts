
export type SerializedReviewSub = {
  id: string;
  title: string;
  type: string;
  description: string;
  link: string;
  createdAt: string;
  project: { id: string; title: string; requirement: string };
  phase: { phaseName: string };
  user: { id: string; name: string; avatarColor: string };
  feedback: Array<{
    id: string;
    text: string;
    isAi: boolean;
    createdAt: string;
    fromUser: { id: string; name: string; avatarColor: string };
  }>;
};

export type SerializedProjectListItem = {
  id: string;
  title: string;
  type: string;
  priority: string;
  status: string;
  currentPhase: string;
  startDate: string;
  progress: number;
  daysRemaining: number;
  activePhaseLabel: string;
  assigneeNames: string[];
};

function utcDayStart(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function groupByDate<T extends { createdAt: string }>(
  items: T[]
): { Today: T[]; Yesterday: T[]; Earlier: T[] } {
  const todayMs = utcDayStart(new Date());
  const yesterdayMs = todayMs - 86_400_000;
  const result: { Today: T[]; Yesterday: T[]; Earlier: T[] } = { Today: [], Yesterday: [], Earlier: [] };
  for (const item of items) {
    const dMs = utcDayStart(new Date(item.createdAt));
    if (dMs === todayMs) result.Today.push(item);
    else if (dMs === yesterdayMs) result.Yesterday.push(item);
    else result.Earlier.push(item);
  }
  return result;
}

export type TypeTab = "all" | "code" | "docs" | "demos";

export function matchesTypeFilter(type: string, tab: TypeTab): boolean {
  if (tab === "all") return true;
  if (tab === "code") return type === "code";
  if (tab === "docs") return type === "document" || type === "architecture";
  if (tab === "demos") return type === "demo" || type === "notebook";
  return true;
}

export function filterProjects<T extends { type: string; status: string }>(
  projects: T[],
  { type, status }: { type: string; status: string }
): T[] {
  return projects.filter(
    (p) => (type === "all" || p.type === type) && (status === "all" || p.status === status)
  );
}

const PRIORITY_ORDER: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export function sortProjects<T extends { priority: string; daysRemaining: number; progress: number; startDate: string }>(
  projects: T[],
  sort: string
): T[] {
  const copy = [...projects];
  switch (sort) {
    case "priority": return copy.sort((a, b) => (PRIORITY_ORDER[b.priority] ?? 0) - (PRIORITY_ORDER[a.priority] ?? 0));
    case "deadline":  return copy.sort((a, b) => a.daysRemaining - b.daysRemaining);
    case "progress":  return copy.sort((a, b) => a.progress - b.progress);
    case "recent":
    default:          return copy.sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }
}
