import * as React from "react";
import Link from "next/link";
import { Clock, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { PROJECT_TYPE_COLORS, PRIORITY_DOT, STATUS_PILL } from "@/lib/design-tokens";

export type ProjectCardProps = {
  href?: string;
  title: string;
  type: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "active" | "completed" | "paused" | "killed";
  phaseLabel: string;
  progress: number;
  daysRemaining: number;
  assigneeNames: string[];
  className?: string;
};

export function ProjectCard({
  href,
  title,
  type,
  priority,
  status,
  phaseLabel,
  progress,
  daysRemaining,
  assigneeNames,
  className,
}: ProjectCardProps) {
  const Wrap: React.ElementType = href ? Link : "div";
  const wrapProps = href ? { href } : {};
  return (
    <Wrap
      {...wrapProps}
      className={cn(
        "group block rounded-lg border border-border bg-bg p-5 shadow-sm transition-all hover:-translate-y-px hover:border-accent/40",
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={cn("rounded-md px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide", PROJECT_TYPE_COLORS[type] ?? PROJECT_TYPE_COLORS.engineering)}>
          {type.replace(/_/g, " ")}
        </span>
        <div className="flex items-center gap-2">
          <span aria-label={`${priority} priority`} className={cn("inline-block h-2 w-2 rounded-full", PRIORITY_DOT[priority])} />
          <button aria-label="More" className="text-fg-subtle hover:text-fg">
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>
      </div>
      <h3 className="mt-3 truncate text-base font-semibold text-fg">{title}</h3>
      <div className="mt-4">
        <p className="text-xs text-fg-muted">{phaseLabel}</p>
        <div className="mt-1 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
            <div className="h-full bg-accent transition-all" style={{ width: `${progress}%` }} />
          </div>
          <span className="text-xs font-medium text-fg">{progress}%</span>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1 text-fg-muted">
          <Clock className="h-3.5 w-3.5" />
          {daysRemaining} days left
        </div>
        <span className={cn("rounded-md px-1.5 py-0.5 text-[10px] font-medium uppercase", STATUS_PILL[status])}>
          {status}
        </span>
      </div>
      <div className="mt-3 flex -space-x-2">
        {assigneeNames.slice(0, 3).map((name, i) => (
          <span
            key={i}
            title={name}
            className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-accent text-[10px] font-semibold text-accent-fg"
          >
            {name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
          </span>
        ))}
        {assigneeNames.length > 3 && (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-bg bg-bg-muted text-[10px] text-fg-muted">
            +{assigneeNames.length - 3}
          </span>
        )}
      </div>
    </Wrap>
  );
}
