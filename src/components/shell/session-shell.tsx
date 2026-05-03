"use client";

import { useRouter } from "next/navigation";
import { AppShell } from "./app-shell";
import type { CommandItem } from "./command-palette";
import type { SessionUser } from "@/lib/session";

function useCeoCommandItems(): CommandItem[] {
  const router = useRouter();
  return [
    { id: "cmd-reviews",      label: "Go to Review Queue",   group: "Navigate", shortcut: "R", run: () => router.push("/reviews") },
    { id: "cmd-capture",      label: "Open AI Capture",       group: "Navigate", shortcut: "C", run: () => router.push("/capture") },
    { id: "cmd-projects",     label: "All Projects",          group: "Navigate",               run: () => router.push("/projects") },
    { id: "cmd-new-project",  label: "New Project",           group: "Create",   shortcut: "N", run: () => router.push("/projects/new") },
    { id: "cmd-team",         label: "Team Roster",           group: "People",                 run: () => router.push("/team") },
    { id: "cmd-availability", label: "Leave & Availability",  group: "People",                 run: () => router.push("/team/availability") },
  ];
}

export function SessionShell({
  user,
  badges,
  notificationCount,
  rightRail,
  children,
}: {
  user: SessionUser;
  badges?: { reviews?: number; capture?: number };
  notificationCount?: number;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
}) {
  const ceoCmds = useCeoCommandItems();
  const commandItems: CommandItem[] = user.roleType === "ceo" ? ceoCmds : [];

  return (
    <AppShell
      role={user.roleType}
      user={{ name: user.name, email: user.email, roleLabel: user.jobTitle }}
      badges={badges}
      notificationCount={notificationCount}
      commandItems={commandItems}
      rightRail={rightRail}
    >
      {children}
    </AppShell>
  );
}
