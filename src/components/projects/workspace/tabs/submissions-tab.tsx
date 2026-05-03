"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/primitives";
import { FileText, ChevronDown, ChevronRight, Bot, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SerializedPhase, SerializedSubmission } from "../types";

function SubmissionRow({ sub }: { sub: SerializedSubmission & { phaseName: string } }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-md border border-border bg-bg">
      <button
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-bg-subtle transition-colors"
        onClick={() => setOpen(v => !v)}
      >
        {open ? <ChevronDown className="h-4 w-4 shrink-0 text-fg-muted" /> : <ChevronRight className="h-4 w-4 shrink-0 text-fg-muted" />}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate font-medium text-sm text-fg">{sub.title}</span>
            <Badge variant="outline" className="text-[11px] shrink-0">{sub.type}</Badge>
          </div>
          <p className="text-xs text-fg-muted mt-0.5">
            by {sub.user.name} · {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })} · {sub.feedback.length} feedback
          </p>
        </div>
      </button>
      {open && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-4">
          {sub.description && <p className="text-sm text-fg">{sub.description}</p>}
          {sub.feedback.length === 0 ? (
            <p className="text-sm text-fg-muted">No feedback yet</p>
          ) : (
            <div className="space-y-3">
              {sub.feedback.map(fb => (
                <div key={fb.id} className="flex gap-3 text-sm">
                  <span className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    fb.isAi ? "bg-accent/10 text-accent" : "bg-bg-muted text-fg-muted"
                  )}>
                    {fb.isAi ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </span>
                  <div>
                    <p className="font-medium text-fg">{fb.isAi ? "AI" : fb.fromUser.name}</p>
                    <p className="text-fg mt-0.5">{fb.text}</p>
                    <p className="text-xs text-fg-muted mt-1">{formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SubmissionsTab({ phases }: { phases: SerializedPhase[] }) {
  const allSubs = phases
    .flatMap(p => p.submissions.map(s => ({ ...s, phaseName: p.phaseName })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (allSubs.length === 0) {
    return <EmptyState icon={FileText} title="No submissions yet" description="Submissions will appear here when team members submit work for review." />;
  }

  const byPhase: Record<string, typeof allSubs> = {};
  for (const sub of allSubs) {
    if (!byPhase[sub.phaseName]) byPhase[sub.phaseName] = [];
    byPhase[sub.phaseName].push(sub);
  }

  return (
    <div className="space-y-6">
      {Object.entries(byPhase).map(([phaseName, subs]) => (
        <section key={phaseName}>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">{phaseName}</h3>
          <div className="space-y-2">
            {subs.map(sub => <SubmissionRow key={sub.id} sub={sub} />)}
          </div>
        </section>
      ))}
    </div>
  );
}
