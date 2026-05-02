"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { SidebarLink } from "./sidebar-link";
import { navForRole, type Role } from "./sidebar-config";
import { Badge } from "@/components/ui/badge";

export type SidebarProps = {
  role: Role;
  userName: string;
  userRoleLabel: string;
  badges?: { reviews?: number; capture?: number };
};

export function Sidebar({ role, userName, userRoleLabel, badges = {} }: SidebarProps) {
  const pathname = usePathname();
  const groups = navForRole(role);

  return (
    <aside
      className="fixed inset-y-0 left-0 z-30 flex w-[var(--sidebar-width)] flex-col border-r border-border bg-bg"
      aria-label="Primary navigation"
    >
      <div className="flex h-[var(--topbar-height)] items-center px-5 border-b border-border">
        <Link href="/" className="text-base font-semibold tracking-tight text-fg">
          Project<span className="text-accent">Hub</span>
        </Link>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {groups.map((group) => (
          <div key={group.label} className="space-y-1">
            <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">
              {group.label}
            </p>
            {group.items.map((item) => (
              <SidebarLink
                key={item.href}
                href={item.href}
                label={item.label}
                icon={item.icon}
                active={pathname === item.href}
                badge={item.badgeKey ? badges[item.badgeKey] : undefined}
              />
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-border p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-accent-fg text-xs font-semibold">
            {userName.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-fg">{userName}</p>
            <Badge variant="secondary" className="text-[10px]">{userRoleLabel}</Badge>
          </div>
        </div>
      </div>
    </aside>
  );
}
