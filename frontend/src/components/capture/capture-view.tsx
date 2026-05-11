"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, EmptyState } from "@/components/primitives";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type ParsedCaptureItem = {
  id: string;
  type: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
};

export type ParsedCaptureSession = {
  id: string;
  rawInput: string;
  createdAt: string;
  items: ParsedCaptureItem[];
};

const TYPE_COLORS: Record<string, string> = {
  todo:       "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  follow_up:  "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  commitment: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
  meeting:    "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  review:     "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  timeline:   "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
};

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-rose-600 animate-pulse",
  high:     "bg-amber-500",
  medium:   "bg-blue-500",
  low:      "bg-slate-400",
};

export function CaptureView({
  recentSessions,
  userId,
  initialSession,
}: {
  recentSessions: ParsedCaptureSession[];
  userId: string;
  initialSession?: ParsedCaptureSession;
}) {
  const router = useRouter();
  const [rawInput, setRawInput] = useState("");
  const [currentSession, setCurrentSession] = useState<ParsedCaptureSession | null>(initialSession ?? null);
  const [pending, start] = useTransition();

  function processInput() {
    if (!rawInput.trim()) return;
    start(async () => {
      const res = await fetch("/api/proxy/v1/capture/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw_input: rawInput }),
      });
      const envelope = await res.json().catch(() => null);
      if (!res.ok || envelope?.status !== "success") {
        return;
      }
      const s = envelope.data as {
        id: string;
        raw_input: string;
        created_at: string;
        items: Array<{
          id: string; type: string; title: string;
          description: string | null; priority: string; status: string;
          created_at: string;
        }>;
      };
      const session: ParsedCaptureSession = {
        id: s.id,
        rawInput: s.raw_input,
        createdAt: s.created_at,
        items: s.items.map(i => ({
          id: i.id,
          type: i.type,
          title: i.title,
          description: i.description ?? "",
          priority: i.priority,
          status: i.status,
          createdAt: i.created_at,
        })),
      };
      setCurrentSession(session);
      setRawInput("");
      router.refresh();
    });
  }

  const groupedItems = currentSession?.items.reduce<Record<string, ParsedCaptureItem[]>>((acc, item) => {
    if (!acc[item.type]) acc[item.type] = [];
    acc[item.type].push(item);
    return acc;
  }, {}) ?? {};

  return (
    <div className="space-y-6">
      <PageHeader
        title="AI Capture"
        description="Paste meeting notes or voice transcripts — AI extracts actionable items"
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_1fr]">
        {/* Input pane */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Input</h3>
          <textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder={"Paste your notes here…\n\nExample: Asked Arjun to finish the API gateway doc by Thursday."}
            className="w-full min-h-[220px] rounded-md border border-border bg-bg px-4 py-3 text-sm text-fg placeholder:text-fg-subtle resize-none outline-none focus:ring-2 focus:ring-accent/30"
          />
          <Button className="w-full gap-2" disabled={!rawInput.trim() || pending} onClick={processInput}>
            <Sparkles className="h-4 w-4" />
            {pending ? "Processing…" : "Process"}
          </Button>
          <div className="flex flex-wrap gap-1.5">
            {["Asked X to do Y by Friday", "Meeting with team on Monday", "Committed to send report by month-end"].map(ex => (
              <button
                key={ex}
                onClick={() => setRawInput(prev => prev ? `${prev}\n${ex}` : ex)}
                className="rounded-full border border-border px-2.5 py-1 text-[11px] text-fg-muted hover:bg-bg-subtle transition-colors"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>

        {/* Parsed items */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Parsed Items {currentSession && `(${currentSession.items.length})`}
          </h3>
          {!currentSession ? (
            <EmptyState icon={Inbox} title="No items yet" description="Process some notes to see extracted items here." />
          ) : currentSession.items.length === 0 ? (
            <EmptyState icon={Inbox} title="Nothing extracted" description="No actionable items found in that text." />
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedItems).map(([type, items]) => (
                <div key={type}>
                  <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-fg-muted">{type.replace("_", " ")}</p>
                  <div className="space-y-2">
                    {items.map(item => (
                      <div key={item.id} className="rounded-md border border-border bg-bg px-4 py-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={cn("text-[11px]", TYPE_COLORS[item.type] ?? "")}>{item.type.replace("_", " ")}</Badge>
                          <span className={cn("h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[item.priority] ?? "bg-slate-400")} />
                          <span className="text-xs text-fg-muted capitalize">{item.priority}</span>
                        </div>
                        <p className="font-medium text-sm text-fg">{item.title}</p>
                        {item.description && <p className="text-xs text-fg-muted mt-0.5">{item.description}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Session history */}
      {recentSessions.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Session History ({recentSessions.length})
          </h3>
          <div className="space-y-2">
            {recentSessions.map(session => (
              <button
                key={session.id}
                onClick={() => setCurrentSession(session)}
                className="w-full rounded-md border border-border bg-bg px-4 py-3 text-left hover:bg-bg-subtle transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="truncate text-sm text-fg font-medium max-w-[70%]">
                    {session.rawInput.slice(0, 80)}{session.rawInput.length > 80 ? "…" : ""}
                  </p>
                  <span className="shrink-0 text-xs text-fg-muted">
                    {formatDistanceToNow(new Date(session.createdAt), { addSuffix: true })}
                  </span>
                </div>
                <p className="text-xs text-fg-muted mt-0.5">{session.items.length} item{session.items.length !== 1 ? "s" : ""}</p>
              </button>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
