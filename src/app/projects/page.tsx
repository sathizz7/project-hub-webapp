import { prisma } from "@/lib/prisma";
import { ProjectsList } from "@/components/projects/projects-list";
import { computeProjectProgress, computeDaysRemaining } from "@/lib/command-center-data";
import type { SerializedProjectListItem } from "@/lib/review-and-projects-helpers";

export default async function ProjectsPage() {
  const projects = await prisma.project.findMany({
    select: {
      id: true,
      title: true,
      type: true,
      priority: true,
      status: true,
      currentPhase: true,
      startDate: true,
      timeboxDays: true,
      createdAt: true,
      phases: {
        select: { status: true, phaseName: true, order: true },
        orderBy: { order: "asc" },
      },
      assignees: { select: { user: { select: { name: true, avatarColor: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized: SerializedProjectListItem[] = projects.map((p) => {
    const progress = computeProjectProgress(p.phases);
    const daysRemaining = computeDaysRemaining(p.startDate, p.timeboxDays);
    const activePhase =
      p.phases.find((ph) => ph.status === "active") ??
      p.phases[p.phases.length - 1];
    const activePhaseLabel = activePhase
      ? `${activePhase.phaseName} · Phase ${p.phases.findIndex((ph) => ph.phaseName === activePhase.phaseName) + 1} of ${p.phases.length}`
      : p.currentPhase || "—";
    return {
      id: p.id,
      title: p.title,
      type: p.type,
      priority: p.priority,
      status: p.status,
      currentPhase: p.currentPhase,
      startDate: p.startDate.toISOString(),
      progress,
      daysRemaining,
      activePhaseLabel,
      assigneeNames: p.assignees.map((a) => a.user.name),
    };
  });

  return <ProjectsList projects={serialized} />;
}
