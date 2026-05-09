import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import type { AiPlan, SerializedCheckpoint } from "../types";

export function OverviewTab({
  requirement,
  aiPlan,
  techStack,
  checkpoints,
}: {
  requirement: string;
  aiPlan: AiPlan;
  techStack: string[];
  checkpoints: SerializedCheckpoint[];
}) {
  return (
    <div className="space-y-8">
      {/* Objective */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Objective</h3>
        <p className="text-sm text-fg leading-relaxed">{requirement}</p>
      </section>

      {/* AI Plan grid */}
      {(aiPlan.summary || aiPlan.milestones?.length || aiPlan.killCriteria?.length || aiPlan.risks?.length) ? (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {aiPlan.summary && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Summary</h3>
              <p className="text-sm text-fg leading-relaxed">{aiPlan.summary}</p>
            </section>
          )}

          {aiPlan.milestones && aiPlan.milestones.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Milestones</h3>
              <ul className="space-y-2">
                {aiPlan.milestones.map((m, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-fg">{m.name}</span>
                    <span className="ml-1 text-fg-muted">— day {m.targetDay}</span>
                    {m.description && <p className="text-xs text-fg-muted mt-0.5">{m.description}</p>}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {aiPlan.killCriteria && aiPlan.killCriteria.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Kill Criteria</h3>
              <ul className="space-y-1">
                {aiPlan.killCriteria.map((k, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-fg">
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-danger" />
                    {k}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {aiPlan.risks && aiPlan.risks.length > 0 && (
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Risks</h3>
              <ul className="space-y-2">
                {aiPlan.risks.map((r, i) => (
                  <li key={i} className="text-sm">
                    <span className="font-medium text-fg">{r.risk}</span>
                    <p className="text-xs text-fg-muted">{r.mitigation}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      ) : null}

      {/* Tech stack */}
      {techStack.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Tech Stack</h3>
          <div className="flex flex-wrap gap-1.5">
            {techStack.map(t => (
              <Badge key={t} variant="outline" className="text-xs">{t}</Badge>
            ))}
          </div>
        </section>
      )}

      {/* Checkpoints */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">Checkpoint History</h3>
        {checkpoints.length === 0 ? (
          <p className="text-sm text-fg-muted">No checkpoints yet</p>
        ) : (
          <ul className="space-y-3">
            {checkpoints.map(c => (
              <li key={c.id} className="flex items-start gap-3 text-sm">
                <span className={cn(
                  "mt-0.5 shrink-0 rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase",
                  c.decision === "continue" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200" : "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200"
                )}>
                  {c.decision}
                </span>
                <div>
                  <p className="text-fg">{c.notes}</p>
                  <p className="text-xs text-fg-muted">{formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
