"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { EmptyState, PageHeader } from "@/components/primitives";
import { FileText, ChevronRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  groupByDate,
  matchesTypeFilter,
  type SerializedReviewSub,
  type TypeTab,
} from "@/lib/review-and-projects-helpers";
import { SubmissionSheetContent } from "./submission-sheet-content";

const TYPE_ICON_COLOR: Record<string, string> = {
  code: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  document: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  architecture: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  notebook: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  demo: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

export function ReviewRow({
  sub,
  onClick,
}: {
  sub: SerializedReviewSub;
  onClick: () => void;
}) {
  const age = formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true });
  return (
    <button
      className="group flex w-full items-center gap-3 rounded-md px-3 py-3 text-left hover:bg-bg-subtle transition-colors"
      onClick={onClick}
    >
      <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded text-[11px] font-semibold uppercase", TYPE_ICON_COLOR[sub.type] ?? "bg-bg-muted text-fg-muted")}>
        {sub.type.slice(0, 3)}
      </span>
      <div className="min-w-0 flex-1">
        <span className="truncate font-medium text-sm text-fg block">{sub.title}</span>
        <p className="text-xs text-fg-muted mt-0.5">
          by {sub.user.name} · {age}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-xs text-fg-muted">{sub.feedback.length} review{sub.feedback.length !== 1 ? "s" : ""}</span>
        <ChevronRight className="h-4 w-4 text-fg-muted" />
      </div>
    </button>
  );
}

function DateGroup({ label, subs, onSelect }: { label: string; subs: SerializedReviewSub[]; onSelect: (s: SerializedReviewSub) => void }) {
  if (subs.length === 0) return null;
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-fg-muted">{label}</h3>
      <div className="rounded-md border border-border bg-bg divide-y divide-border">
        {subs.map((sub) => (
          <ReviewRow key={sub.id} sub={sub} onClick={() => onSelect(sub)} />
        ))}
      </div>
    </section>
  );
}

function TabContent({ subs, onSelect }: { subs: SerializedReviewSub[]; onSelect: (s: SerializedReviewSub) => void }) {
  if (subs.length === 0) {
    return <EmptyState icon={FileText} title="Nothing here" description="No submissions match this filter." />;
  }
  const groups = groupByDate(subs);
  return (
    <div className="space-y-6">
      <DateGroup label="Today" subs={groups.Today} onSelect={onSelect} />
      <DateGroup label="Yesterday" subs={groups.Yesterday} onSelect={onSelect} />
      <DateGroup label="Earlier" subs={groups.Earlier} onSelect={onSelect} />
    </div>
  );
}

export function ReviewQueue({ submissions }: { submissions: SerializedReviewSub[] }) {
  const [selectedSub, setSelectedSub] = useState<SerializedReviewSub | null>(null);

  const pendingCount = submissions.filter((s) => s.feedback.length === 0).length;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          title="Review Queue"
          description={`${pendingCount} pending review${pendingCount !== 1 ? "s" : ""} · ${submissions.length} total`}
        />

        <Tabs defaultValue="all" onValueChange={() => {}}>
          <TabsList variant="line" className="w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0 mb-6">
            {(["all", "code", "docs", "demos"] as const).map((tab) => (
              <TabsTrigger key={tab} value={tab} className="rounded-none px-4 py-2 capitalize text-sm">
                {tab}
              </TabsTrigger>
            ))}
          </TabsList>

          {(["all", "code", "docs", "demos"] as const).map((tab) => (
            <TabsContent key={tab} value={tab}>
              <TabContent
                subs={submissions.filter((s) => matchesTypeFilter(s.type, tab as TypeTab))}
                onSelect={setSelectedSub}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      <Sheet open={selectedSub !== null} onOpenChange={(open) => { if (!open) setSelectedSub(null); }}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0">
          {selectedSub && (
            <SubmissionSheetContent sub={selectedSub} onClose={() => setSelectedSub(null)} />
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}
