"use client";

import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { CommandPalette, type CommandItem } from "./command-palette";
import type { Role } from "./sidebar-config";

export type AppShellProps = {
  role: Role;
  user: { name: string; email: string; roleLabel: string };
  badges?: { reviews?: number; capture?: number };
  notificationCount?: number;
  commandItems?: CommandItem[];
  rightRail?: React.ReactNode;
  children: React.ReactNode;
};

export function AppShell({
  role,
  user,
  badges,
  notificationCount,
  commandItems = [],
  rightRail,
  children,
}: AppShellProps) {
  return (
    <div className="min-h-dvh bg-bg-subtle text-fg">
      <Sidebar role={role} userName={user.name} userRoleLabel={user.roleLabel} badges={badges} />
      <Topbar userName={user.name} userEmail={user.email} notificationCount={notificationCount} />
      <CommandPalette items={commandItems} />
      <div
        className="flex"
        style={{ marginLeft: "var(--sidebar-width)" }}
      >
        <main className="flex-1 min-w-0 p-8">{children}</main>
        {rightRail && (
          <aside
            className="sticky top-[var(--topbar-height)] hidden h-[calc(100dvh-var(--topbar-height))] w-[var(--rail-width)] shrink-0 border-l border-border bg-bg lg:block"
            aria-label="Contextual rail"
          >
            {rightRail}
          </aside>
        )}
      </div>
    </div>
  );
}
