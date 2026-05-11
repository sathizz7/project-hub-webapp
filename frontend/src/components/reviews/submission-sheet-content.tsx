"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Bot, User, Sparkles, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import type { SerializedReviewSub } from "@/lib/review-and-projects-helpers";

export function SubmissionSheetContent({
  sub,
  onClose,
}: {
  sub: SerializedReviewSub;
  onClose: () => void;
}) {
  const router = useRouter();
  const [feedbackText, setFeedbackText] = useState("");
  const [generating, setGenerating] = useState(false);
  const [sending, setSending] = useState(false);

  async function generateAiFeedback() {
    setGenerating(true);
    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: sub.title,
          type: sub.type,
          description: sub.description,
          projectContext: sub.project.requirement,
        }),
      });
      const data = await res.json() as { feedback?: string };
      setFeedbackText(data.feedback ?? "");
    } finally {
      setGenerating(false);
    }
  }

  async function sendFeedback() {
    if (!feedbackText.trim()) return;
    setSending(true);
    try {
      const meRes = await fetch("/api/proxy/v1/users");
      const usersEnvelope = await meRes.json() as { data: Array<{ id: string; role_type: string }> };
      const users = usersEnvelope.data ?? [];
      const ceo = users.find((u) => u.role_type === "ceo");
      if (!ceo) return;
      const res = await fetch(`/api/proxy/v1/submissions/${sub.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: feedbackText, is_ai: false }),
      });
      const envelope = await res.json().catch(() => null);
      if (!res.ok || envelope?.status !== "success") {
        alert(envelope?.message ?? "Failed to send feedback");
        return;
      }
      setFeedbackText("");
      router.refresh();
      onClose();
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center gap-2 mb-1">
          <Badge variant="outline" className="text-[11px]">{sub.type}</Badge>
          <span className="text-xs text-fg-muted">{sub.phase.phaseName} · {sub.project.title}</span>
        </div>
        <h2 className="text-base font-semibold text-fg">{sub.title}</h2>
        <p className="text-xs text-fg-muted mt-1">
          by {sub.user.name} · {formatDistanceToNow(new Date(sub.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-6">
        {sub.description && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-fg-muted">Description</h3>
            <p className="text-sm text-fg leading-relaxed">{sub.description}</p>
          </section>
        )}

        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Feedback ({sub.feedback.length})
          </h3>
          {sub.feedback.length === 0 ? (
            <p className="text-sm text-fg-muted">No feedback yet.</p>
          ) : (
            <div className="space-y-3">
              {sub.feedback.map((fb) => (
                <div key={fb.id} className="flex gap-3 text-sm">
                  <span className={cn(
                    "mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                    fb.isAi ? "bg-accent/10 text-accent" : "bg-bg-muted text-fg-muted"
                  )}>
                    {fb.isAi ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
                  </span>
                  <div>
                    <p className="font-medium text-fg">{fb.isAi ? "AI" : fb.fromUser.name}</p>
                    <p className="text-fg mt-0.5 whitespace-pre-wrap">{fb.text}</p>
                    <p className="text-xs text-fg-muted mt-1">
                      {formatDistanceToNow(new Date(fb.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted">Add Feedback</h3>
            <Button size="sm" variant="outline" className="gap-1.5 text-xs" disabled={generating} onClick={generateAiFeedback}>
              <Sparkles className="h-3 w-3" />
              {generating ? "Generating…" : "Generate AI draft"}
            </Button>
          </div>
          <Textarea
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            placeholder="Write your feedback here, or generate an AI draft above…"
            className="min-h-[120px] resize-none text-sm"
          />
        </section>
      </div>

      {/* Footer */}
      <div className="border-t border-border px-6 py-4">
        <Button className="w-full gap-2" disabled={!feedbackText.trim() || sending} onClick={sendFeedback}>
          <Send className="h-4 w-4" />
          {sending ? "Sending…" : "Send Feedback"}
        </Button>
      </div>
    </div>
  );
}
