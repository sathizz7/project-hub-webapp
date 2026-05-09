import * as React from "react";
import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type KPIStatProps = {
  label: string;
  value: number | string;
  delta?: { value: string; direction: "up" | "down" | "flat" };
  icon?: LucideIcon;
  iconBg?: string;
  tone?: "default" | "danger" | "warning" | "success";
  className?: string;
};

const TONE_BORDER: Record<string, string> = {
  danger: "border-t-2 border-t-danger",
  warning: "border-t-2 border-t-warning",
  success: "border-t-2 border-t-success",
  default: "",
};

const ICON_BG_DEFAULTS: Record<string, string> = {
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  success: "bg-success-soft text-success",
  default: "bg-accent-soft text-accent",
};

export function KPIStat({ label, value, delta, icon: Icon, iconBg, tone = "default", className }: KPIStatProps) {
  const iconBgClass = iconBg ?? ICON_BG_DEFAULTS[tone];
  return (
    <div className={cn(
      "rounded-lg border border-border bg-bg p-5 card-elevated transition-shadow hover:card-raised",
      TONE_BORDER[tone],
      className
    )}>
      <div className="flex items-start justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-fg-muted">{label}</p>
        {Icon && (
          <span className={cn("flex h-7 w-7 items-center justify-center rounded-md", iconBgClass)}>
            <Icon className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
      <p className={cn(
        "mt-3 text-2xl font-bold tabular-nums tracking-tight",
        tone === "danger" ? "text-danger" : tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-fg"
      )}>
        {value}
      </p>
      {delta && (
        <p
          data-testid="delta"
          data-direction={delta.direction}
          className={cn(
            "mt-1.5 inline-flex items-center gap-0.5 text-xs font-medium",
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
