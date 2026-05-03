import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { SessionShell } from "@/components/shell/session-shell";

export default async function ProjectDetailLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return <SessionShell user={user}>{children}</SessionShell>;
}
