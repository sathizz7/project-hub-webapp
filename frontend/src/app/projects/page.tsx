import { apiServerFetch } from "@/lib/api";
import { ProjectsList } from "@/components/projects/projects-list";
import { computeDaysRemaining } from "@/lib/command-center-data";
import type { SerializedProjectListItem } from "@/lib/review-and-projects-helpers";

type ProjectAssigneeUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: "ceo" | "team_member";
  avatar_color: string;
};

type ProjectListRow = {
  id: string;
  title: string;
  type: "engineering" | "research";
  status: "active" | "completed" | "killed";
  priority: "low" | "medium" | "high" | "critical";
  current_phase: string | null;
  timebox_days: number | null;
  start_date: string | null;
  progress: number;
  assignees: ProjectAssigneeUser[];
  created_at: string;
};

export default async function ProjectsPage() {
  const projects = await apiServerFetch<ProjectListRow[]>("/api/v1/projects");

  const serialized: SerializedProjectListItem[] = projects.map((p) => {
    const daysRemaining =
      p.start_date && p.timebox_days != null
        ? computeDaysRemaining(new Date(p.start_date), p.timebox_days)
        : 0;

    return {
      id: p.id,
      title: p.title,
      type: p.type,
      priority: p.priority,
      status: p.status,
      currentPhase: p.current_phase ?? "",
      startDate: p.start_date ?? new Date(p.created_at).toISOString(),
      progress: p.progress,
      daysRemaining,
      activePhaseLabel: p.current_phase ?? "—",
      assigneeNames: p.assignees.map((a) => a.name),
    };
  });

  return <ProjectsList projects={serialized} />;
}
