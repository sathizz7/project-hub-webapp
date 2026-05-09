"use client";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { NotificationsBell } from "./notifications-bell";
import { UserMenu } from "./user-menu";
import { CommandPaletteTrigger } from "./command-palette-trigger";

export type TopbarProps = {
  userName: string;
  userEmail: string;
  notificationCount?: number;
};

export function Topbar({ userName, userEmail, notificationCount = 0 }: TopbarProps) {
  return (
    <header
      className="sticky top-0 z-20 flex h-[var(--topbar-height)] items-center gap-4 border-b border-border bg-bg/95 px-6 backdrop-blur-md"
      style={{ marginLeft: "var(--sidebar-width)" }}
    >
      <CommandPaletteTrigger className="flex-1 max-w-[480px]" />
      <div className="ml-auto flex items-center gap-1">
        <NotificationsBell count={notificationCount} />
        <ThemeToggle />
        <UserMenu name={userName} email={userEmail} />
      </div>
    </header>
  );
}
