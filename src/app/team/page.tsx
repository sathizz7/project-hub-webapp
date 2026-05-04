import { prisma } from "@/lib/prisma";
import { computePerformanceMetrics } from "@/lib/queries/performance";
import { deriveDepartment, type SerializedMember } from "@/lib/team-helpers";
import { TeamOverview } from "@/components/team/team-overview";

export default async function TeamPage() {
  const users = await prisma.user.findMany({
    where: { roleType: "team_member" },
    select: {
      id: true, name: true, role: true, email: true, avatarColor: true,
      assignedProjects: {
        where: { project: { status: "active" } },
        select: { projectId: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const members: SerializedMember[] = await Promise.all(
    users.map(async u => {
      const perf = await computePerformanceMetrics(u.id);
      return {
        id: u.id, name: u.name, role: u.role, email: u.email, avatarColor: u.avatarColor,
        department: deriveDepartment(u.role),
        activeProjectCount: u.assignedProjects.length,
        performance: perf,
      };
    })
  );

  return <TeamOverview members={members} />;
}
