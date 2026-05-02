import * as React from "react";
import { AlertTriangle, Lightbulb, Hand, Sparkles, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InsightSeverity = "risk" | "opportunity" | "blocker" | "suggestion";

const SEVERITY_META: Record<InsightSeverity, { icon: LucideIcon; stripe: string; iconColor: string }> = {
  risk: { icon: AlertTriangle, stripe: "bg-danger", iconColor: "text-danger" },
  opportunity: { icon: Lightbulb, stripe: "bg-success", iconColor: "text-success" },
  blocker: { icon: Hand, stripe: "bg-warning", iconColor: "text-warning" },
  suggestion: { icon: Sparkles, stripe: "bg-info", iconColor: "text-info" },
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
    <div className={cn("relative overflow-hidden rounded-md border border-border bg-bg p-3 pl-4", className)}>
      <span className={cn("absolute left-0 top-0 bottom-0 w-1", meta.stripe)} aria-hidden />
      <div className="flex items-start gap-2">
        <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", meta.iconColor)} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-fg">{title}</p>
          <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
          {action && (
            <button
              onClick={action.onClick}
              className="mt-2 text-xs font-medium text-accent hover:text-accent-strong"
            >
              {action.label} →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
