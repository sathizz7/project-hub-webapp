import { auth } from "@/lib/auth";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  roleType: "ceo" | "team_member";
  jobTitle: string;
  avatarColor: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  if (!session?.user?.id) return null;
  const u = session.user;
  return {
    id: u.id,
    name: u.name ?? "",
    email: u.email ?? "",
    roleType: u.roleType,
    jobTitle: u.jobTitle,
    avatarColor: u.avatarColor,
  };
}
