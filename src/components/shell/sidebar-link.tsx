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
        "group relative flex h-9 items-center gap-2 rounded-md px-3 text-sm transition-colors",
        active
          ? "bg-accent-soft text-accent-strong font-medium"
          : "text-fg-muted hover:bg-bg-muted hover:text-fg"
      )}
    >
      {active && (
        <span aria-hidden className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-full bg-accent" />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1 truncate">{label}</span>
      {badge !== undefined && (
        <span className="rounded-full bg-bg-muted px-1.5 text-xs font-medium text-fg-muted group-data-[active=true]:bg-accent group-data-[active=true]:text-accent-fg">
          {badge}
        </span>
      )}
    </Link>
  );
}
