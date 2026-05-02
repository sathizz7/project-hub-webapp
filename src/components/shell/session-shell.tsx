"use client";

import { AppShell } from "./app-shell";
import type { CommandItem } from "./command-palette";
import type { SessionUser } from "@/lib/session";

export function SessionShell({
  user,
  commandItems = [],
  badges,
  notificationCount,
  rightRail,
  children,
}: {
  user: SessionUser;
  commandItems?: CommandItem[];
  badges?: { reviews?: number; capture?: number };
  notificationCount?: number;
  rightRail?: React.ReactNode;
  children: React.ReactNode;
}) {
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
