import * as React from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT } from "@/lib/design-tokens";

export type TaskRowProps = {
  title: string;
  assigneeName?: string;
  due?: string;
  priority?: "low" | "medium" | "high" | "critical";
  done?: boolean;
  onToggle?: (next: boolean) => void;
  className?: string;
};

export function TaskRow({ title, assigneeName, due, priority = "medium", done = false, onToggle, className }: TaskRowProps) {
  return (
    <div className={cn("flex h-10 items-center gap-3 rounded-md px-2 hover:bg-bg-muted", className)}>
      <Checkbox checked={done} onCheckedChange={(v) => onToggle?.(Boolean(v))} aria-label={`Mark "${title}" ${done ? "incomplete" : "done"}`} />
      <span aria-label={`${priority} priority`} className={cn("h-2 w-2 rounded-full shrink-0", PRIORITY_DOT[priority])} />
      <span className={cn("flex-1 truncate text-sm", done ? "text-fg-muted line-through" : "text-fg")}>{title}</span>
      {assigneeName && <span className="text-xs text-fg-muted">{assigneeName}</span>}
      {due && <span className="text-xs text-fg-muted">{due}</span>}
    </div>
  );
}
