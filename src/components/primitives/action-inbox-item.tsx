import * as React from "react";
import { Clock, Eye, Sparkles, ArrowUpRight, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type InboxKind = "review" | "capture" | "extension";

const KIND_META: Record<InboxKind, { icon: LucideIcon; bg: string; fg: string; label: string }> = {
  review:    { icon: Eye,          bg: "bg-purple-100 dark:bg-purple-900/40", fg: "text-purple-700 dark:text-purple-300", label: "Review" },
  capture:   { icon: Sparkles,     bg: "bg-amber-100 dark:bg-amber-900/40",   fg: "text-amber-700 dark:text-amber-300",   label: "Capture" },
  extension: { icon: ArrowUpRight, bg: "bg-orange-100 dark:bg-orange-900/40", fg: "text-orange-700 dark:text-orange-300", label: "Extension" },
};

export type ActionInboxItemProps = {
  kind: InboxKind;
  title: string;
  context: string;
  age: string;
  primaryAction: { label: string; onClick: () => void };
  secondaryAction?: { label: string; onClick: () => void };
  className?: string;
};

export function ActionInboxItem({ kind, title, context, age, primaryAction, secondaryAction, className }: ActionInboxItemProps) {
  const meta = KIND_META[kind];
  const KindIcon = meta.icon;
  return (
    <div className={cn(
      "group flex items-start gap-3 rounded-lg border border-border bg-bg p-3.5 card-elevated transition-all hover:border-accent/30 hover:card-raised",
      className
    )}>
      <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", meta.bg, meta.fg)}>
        <KindIcon className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-fg">{title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-fg-muted">
          <span className={cn("font-medium", meta.fg)}>{meta.label}</span>
          <span>·</span>
          <span className="truncate">{context}</span>
          <span>·</span>
          <Clock className="h-3 w-3 shrink-0" />
          <span className="shrink-0">{age}</span>
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        {secondaryAction && (
          <button
            onClick={secondaryAction.onClick}
            className="rounded-md px-2.5 py-1.5 text-xs font-medium text-fg-muted transition-colors hover:bg-bg-muted hover:text-fg"
          >
            {secondaryAction.label}
          </button>
        )}
        <button
          onClick={primaryAction.onClick}
          className="rounded-md bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-strong"
        >
          {primaryAction.label}
        </button>
      </div>
    </div>
  );
}
