"use client";

import Link from "next/link";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarLinkProps = {
  href: string;
  label: string;
  icon: LucideIcon;
  active: boolean;
  badge?: number;
};

export function SidebarLink({ href, label, icon: Icon, active, badge }: SidebarLinkProps) {
  return (
    <Link
      href={href}
      data-active={active}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-accent-soft text-accent-strong font-semibold"
          : "text-fg-muted hover:bg-bg-muted hover:text-fg"
      )}
    >
      {active && (
        <span aria-hidden className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-accent" />
      )}
      <Icon className={cn("h-4 w-4 shrink-0 transition-colors", active ? "text-accent" : "text-fg-subtle group-hover:text-fg-muted")} />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className={cn(
          "rounded-full px-1.5 text-xs font-medium",
          active ? "bg-accent text-accent-fg" : "bg-bg-muted text-fg-muted"
        )}>
          {badge}
        </span>
      )}
    </Link>
  );
}
