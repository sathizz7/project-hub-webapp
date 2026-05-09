"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PhaseTracker } from "@/components/primitives";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SerializedPhase } from "../types";
import type { PhaseStatus } from "@/components/primitives/phase-tracker";

export function PhasesTab({
  phases,
  projectId,
  projectStatus,
}: {
  phases: SerializedPhase[];
  projectId: string;
  projectStatus: string;
}) {
  const router = useRouter();
  const [completing, setCompleting] = useState<string | null>(null);

  const steps = phases.map(p => ({
    id: p.id,
    label: p.phaseName,
    status: p.status as PhaseStatus,
  }));

  async function completePhase(phaseId: string) {
    setCompleting(phaseId);
    await fetch("/api/phases", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phaseId, status: "completed" }),
    });
    setCompleting(null);
    router.refresh();
  }

  return (
    <div className="space-y-8">
      <PhaseTracker steps={steps} />

      <div className="space-y-4">
        {phases.map(phase => (
          <div key={phase.id} className="rounded-lg border border-border bg-bg p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-fg">{phase.phaseName}</h3>
                <span className={cn(
                  "rounded px-1.5 py-0.5 text-[11px] font-medium uppercase",
                  phase.status === "completed" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200"
                    : phase.status === "active" ? "bg-accent/10 text-accent"
                    : "bg-bg-muted text-fg-muted"
                )}>
                  {phase.status}
                </span>
              </div>
              {phase.status === "active" && projectStatus !== "completed" && (
                <Button
                  size="sm"
                  variant="outline"
                  disabled={completing === phase.id}
                  onClick={() => completePhase(phase.id)}
                >
                  {completing === phase.id ? "Completing…" : "Mark complete"}
                </Button>
              )}
            </div>

            {phase.checklist.length > 0 ? (
              <ul className="space-y-2">
                {phase.checklist.map((item, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-fg">
                    <Checkbox
                      id={`${phase.id}-item-${i}`}
                      checked={phase.status === "completed"}
                      disabled
                      className="shrink-0"
                    />
                    <label htmlFor={`${phase.id}-item-${i}`} className={cn(phase.status === "completed" && "line-through text-fg-muted")}>
                      {item}
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-fg-muted">No checklist items</p>
            )}

            {phase.submissions.length > 0 && (
              <p className="mt-3 text-xs text-fg-muted">{phase.submissions.length} submission{phase.submissions.length !== 1 ? "s" : ""}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
