import * as React from "react";
import { AlertTriangle, Lightbulb, Hand, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightSeverity = "risk" | "opportunity" | "blocker" | "suggestion";

const SEVERITY_META: Record<InsightSeverity, { icon: LucideIcon; stripe: string; iconColor: string; bg: string }> = {
  risk:        { icon: AlertTriangle, stripe: "bg-danger",  iconColor: "text-danger",  bg: "bg-danger/[0.04] dark:bg-danger/[0.08]" },
  opportunity: { icon: Lightbulb,    stripe: "bg-success", iconColor: "text-success", bg: "bg-success/[0.04] dark:bg-success/[0.08]" },
  blocker:     { icon: Hand,         stripe: "bg-warning", iconColor: "text-warning", bg: "bg-warning/[0.04] dark:bg-warning/[0.08]" },
  suggestion:  { icon: Sparkles,     stripe: "bg-info",    iconColor: "text-info",    bg: "bg-info/[0.04] dark:bg-info/[0.08]" },
};

export type InsightCardProps = {
  severity: InsightSeverity;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
};

export function InsightCard({ severity, title, description, action, className }: InsightCardProps) {
  const meta = SEVERITY_META[severity];
  const Icon = meta.icon;
  return (
    <div className={cn(
      "relative overflow-hidden rounded-lg border border-border p-4 pl-5 card-elevated transition-shadow hover:card-raised",
      meta.bg,
      className
    )}>
      <span className={cn("absolute left-0 top-0 bottom-0 w-[3px]", meta.stripe)} aria-hidden />
      <div className="flex items-start gap-3">
        <span className={cn("mt-0.5 shrink-0", meta.iconColor)}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-fg">{title}</p>
          <p className="mt-0.5 text-xs leading-relaxed text-fg-muted">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-xs font-semibold text-accent transition-colors hover:text-accent-strong"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
