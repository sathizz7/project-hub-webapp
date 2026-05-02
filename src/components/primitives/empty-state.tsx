import * as React from "react";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type EmptyStateProps = {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-3 rounded-md border border-dashed border-border bg-bg p-12 text-center", className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-muted">
        <Icon className="h-6 w-6 text-fg-muted" />
      </div>
      <div>
        <p className="text-sm font-medium text-fg">{title}</p>
        {description && <p className="mt-1 text-sm text-fg-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}
