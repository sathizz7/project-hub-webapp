import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export type PhaseStatus = "pending" | "active" | "in_discussion" | "completed";

export type PhaseTrackerStep = {
  id: string;
  label: string;
  status: PhaseStatus;
};

export function PhaseTracker({ steps }: { steps: PhaseTrackerStep[] }) {
  return (
    <ol className="flex w-full items-center gap-2" aria-label="Project phases">
      {steps.map((step, i) => {
        const last = i === steps.length - 1;
        return (
          <li key={step.id} className="flex flex-1 items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <span
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                  step.status === "completed" && "border-success bg-success text-white",
                  step.status === "active" && "border-accent bg-accent text-accent-fg",
                  step.status === "in_discussion" && "border-warning bg-warning-soft text-warning",
                  step.status === "pending" && "border-border bg-bg text-fg-subtle"
                )}
              >
                {step.status === "completed" ? <Check className="h-4 w-4" /> : i + 1}
              </span>
              <span className="text-[11px] font-medium text-fg-muted">{step.label}</span>
            </div>
            {!last && (
              <span
                className={cn(
                  "h-px flex-1",
                  step.status === "completed" ? "bg-success" : "bg-border"
                )}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
