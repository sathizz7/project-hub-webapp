import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { computePerformanceMetrics } from "@/lib/performance";
import { getTasksForUser, getUpcomingLeavesForUser } from "@/lib/queries";
import { deriveDepartment, type SerializedMember, type SerializedLeaveRequest } from "@/lib/team-helpers";
import { MemberProfile } from "@/components/team/member-profile";

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [user, tasks, leaves, recentSubs, perf] = await Promise.all([
    prisma.user.findUnique({
      where: { id },
      include: {
        assignedProjects: {
          include: {
            project: { select: { id: true, title: true, type: true, status: true, currentPhase: true } },
          },
        },
      },
    }),
    getTasksForUser(id),
    getUpcomingLeavesForUser(id, 365),
    prisma.submission.findMany({
      where: { userId: id },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        project: { select: { id: true, title: true } },
        phase: { select: { phaseName: true } },
        _count: { select: { feedback: true } },
      },
    }),
    computePerformanceMetrics(id),
  ]);

  if (!user) notFound();

  const member: SerializedMember = {
    id: user.id, name: user.name, role: user.role, email: user.email, avatarColor: user.avatarColor,
    department: deriveDepartment(user.role),
    activeProjectCount: user.assignedProjects.filter(a => a.project.status === "active").length,
    performance: perf,
  };

  const activeProjects = user.assignedProjects
    .filter(a => a.project.status === "active")
    .map(a => a.project);

  const serializedLeaves: SerializedLeaveRequest[] = leaves.map(l => ({
    id: l.id, type: l.type,
    startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(),
    days: l.days, reason: l.reason, status: l.status,
    coveragePlan: l.coveragePlan, contingencyNote: l.contingencyNote,
    createdAt: l.createdAt.toISOString(),
    user: l.user, approvedBy: l.approvedBy ?? null,
  }));

  return (
    <MemberProfile
      data={{
        member,
        activeProjects,
        tasks: tasks.map(t => ({
          id: t.id, title: t.title,
          priority: t.priority as "low" | "medium" | "high" | "critical",
          status: t.status,
          dueDate: t.dueDate ? t.dueDate.toISOString() : null,
          project: t.project,
        })),
        recentSubmissions: recentSubs.map(s => ({
          id: s.id, title: s.title, type: s.type,
          createdAt: s.createdAt.toISOString(),
          project: s.project, phase: s.phase,
          feedbackCount: s._count.feedback,
        })),
        leaves: serializedLeaves,
      }}
    />
  );
}
