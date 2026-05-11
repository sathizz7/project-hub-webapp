import { apiServerFetch } from "@/lib/api";
import { computePerformanceMetrics } from "@/lib/performance";
import { deriveDepartment, type SerializedMember } from "@/lib/team-helpers";
import { TeamOverview } from "@/components/team/team-overview";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: "ceo" | "team_member";
  avatar_color: string;
};

export default async function TeamPage() {
  const allUsers = await apiServerFetch<UserRow[]>("/api/v1/users");
  const users = allUsers.filter(u => u.role_type === "team_member");

  const members: SerializedMember[] = await Promise.all(
    users.map(async u => {
      const perf = await computePerformanceMetrics(u.id);
      return {
        id: u.id, name: u.name, role: u.role, email: u.email, avatarColor: u.avatar_color,
        department: deriveDepartment(u.role),
        activeProjectCount: 0,
        performance: perf,
      };
    })
  );

  return <TeamOverview members={members} />;
}
