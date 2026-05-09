import { format, addDays } from "date-fns";

export type SerializedMember = {
  id: string; name: string; role: string; email: string; avatarColor: string;
  department: string; activeProjectCount: number;
  performance: { score: number; avgResponseHours: number; submissionsCount: number };
};

export type SerializedLeaveRequest = {
  id: string; type: string; startDate: string; endDate: string; days: number;
  reason: string; status: string; coveragePlan: string; contingencyNote: string;
  createdAt: string;
  user: { id: string; name: string; avatarColor: string; role: string };
  approvedBy: { id: string; name: string } | null;
};

export type WeekDay = {
  date: string;
  label: string;
  leavingUsers: Array<{ id: string; name: string; avatarColor: string }>;
};

export function deriveDepartment(role: string): string {
  const r = role.toLowerCase();
  if (r.includes("data") || r.includes("ml") || r.includes("scientist") || r.includes("analyst")) return "Data Science";
  if (r.includes("engineer") || r.includes("devops") || r.includes("backend") || r.includes("full-stack") || r.includes("fullstack")) return "Engineering";
  if (r.includes("design") || r.includes("ux") || r.includes("ui")) return "Design";
  if (r.includes("product") || r.includes("manager") || r.includes("pm")) return "Product";
  if (r.includes("ceo") || r.includes("cto") || r.includes("coo") || r.includes("founder") || r.includes("head")) return "Leadership";
  return "Other";
}

export function filterMembers(members: SerializedMember[], department: string): SerializedMember[] {
  if (department === "all") return members;
  return members.filter(m => m.department === department);
}

export function sortMembers(members: SerializedMember[], sort: string): SerializedMember[] {
  const copy = [...members];
  switch (sort) {
    case "score":    return copy.sort((a, b) => b.performance.score - a.performance.score);
    case "response": return copy.sort((a, b) => a.performance.avgResponseHours - b.performance.avgResponseHours);
    case "name":
    default:         return copy.sort((a, b) => a.name.localeCompare(b.name));
  }
}

export function buildWeekStrip(
  today: Date,
  leaves: Array<{ startDate: string; endDate: string; user: { id: string; name: string; avatarColor: string } }>
): WeekDay[] {
  return Array.from({ length: 7 }, (_, i) => {
    const day = addDays(today, i);
    const dayStartMs = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
    const dayEndMs   = dayStartMs + 86_400_000 - 1;
    const leavingUsers = leaves
      .filter(l => new Date(l.startDate).getTime() <= dayEndMs && new Date(l.endDate).getTime() >= dayStartMs)
      .map(l => l.user);
    return { date: day.toISOString().split("T")[0], label: format(day, "EEE d"), leavingUsers };
  });
}
