"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/primitives";
import { Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SerializedExtension } from "../types";

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
  auto_escalated: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200",
};

export function ExtensionsTab({ extensions }: { extensions: SerializedExtension[] }) {
  const router = useRouter();
  const [acting, setActing] = useState<string | null>(null);
  const [comments, setComments] = useState<Record<string, string>>({});

  if (extensions.length === 0) {
    return <EmptyState icon={Clock} title="No deadline extensions" description="Extension requests will appear here when submitted." />;
  }

  async function decide(id: string, status: "approved" | "rejected") {
    setActing(id);
    await fetch(`/api/deadline-extensions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ceoComment: comments[id] ?? "" }),
    });
    setActing(null);
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {extensions.map(ext => {
        const daysReq = Math.round(
          (new Date(ext.requestedDeadline).getTime() - new Date(ext.originalDeadline).getTime()) / 86_400_000
        );
        return (
          <div key={ext.id} className={cn("rounded-lg border bg-bg p-4", ext.escalationLevel >= 2 ? "border-danger" : "border-border")}>
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-sm text-fg">+{daysReq} days</span>
                  {ext.task && <span className="text-xs text-fg-muted">on "{ext.task.title}"</span>}
                  <Badge className={cn("text-[11px]", STATUS_COLORS[ext.status] ?? "")}>{ext.status.replace("_", " ")}</Badge>
                  {ext.escalationLevel >= 2 && <Badge className="text-[11px] bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-200">escalated</Badge>}
                </div>
                <p className="text-xs text-fg-muted">
                  Requested by <span className="font-medium text-fg">{ext.requestedBy.name}</span>
                  {" · "}{formatDistanceToNow(new Date(ext.createdAt), { addSuffix: true })}
                </p>
                {ext.reasonDetail && <p className="text-sm text-fg mt-1">{ext.reasonDetail}</p>}
                {ext.ceoComment && (
                  <p className="text-xs text-fg-muted italic mt-1">CEO: "{ext.ceoComment}"</p>
                )}
              </div>
            </div>

            {ext.status === "pending" && (
              <div className="mt-3 space-y-2">
                <input
                  type="text"
                  placeholder="Optional comment…"
                  value={comments[ext.id] ?? ""}
                  onChange={e => setComments(prev => ({ ...prev, [ext.id]: e.target.value }))}
                  className="w-full rounded-md border border-border bg-bg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-accent/30"
                />
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10" disabled={acting === ext.id} onClick={() => decide(ext.id, "approved")}>
                    {acting === ext.id ? "…" : "Approve"}
                  </Button>
                  <Button size="sm" variant="outline" className="text-danger border-danger hover:bg-danger/10" disabled={acting === ext.id} onClick={() => decide(ext.id, "rejected")}>
                    {acting === ext.id ? "…" : "Reject"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
