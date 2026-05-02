import * as React from "react";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KPIStatProps = {
  label: string;
  value: number | string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon?: LucideIcon;
  tone?: "default" | "danger";
  className?: string;
};

export function KPIStat({ label, value, delta, icon: Icon, tone = "default", className }: KPIStatProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-bg p-5 shadow-sm", className)}>
      <div className="flex items-center justify-between">
        <p className="text-sm text-fg-muted">{label}</p>
        {Icon && <Icon className="h-4 w-4 text-fg-subtle" />}
      </div>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", tone === "danger" ? "text-danger" : "text-fg")}>
        {value}
      </p>
      {delta && (
        <p
          data-testid="delta"
          data-direction={delta.direction}
          className={cn(
            "mt-1 inline-flex items-center gap-1 text-xs",
            delta.direction === "up" && "text-success",
            delta.direction === "down" && "text-danger",
            delta.direction === "flat" && "text-fg-muted"
          )}
        >
          {delta.direction === "up" && <ArrowUp className="h-3 w-3" />}
          {delta.direction === "down" && <ArrowDown className="h-3 w-3" />}
          {delta.value}
        </p>
      )}
    </div>
  );
}
