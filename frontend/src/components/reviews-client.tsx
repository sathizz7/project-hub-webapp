"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  Loader2,
  MessageSquare,
  Clock,
  FileText,
  Code,
  Layout,
  BookOpen,
  Monitor,
} from "lucide-react";
import { format } from "date-fns";

const submissionTypeIcons: Record<string, React.ReactNode> = {
  document: <FileText className="h-4 w-4" />,
  code: <Code className="h-4 w-4" />,
  architecture: <Layout className="h-4 w-4" />,
  notebook: <BookOpen className="h-4 w-4" />,
  demo: <Monitor className="h-4 w-4" />,
};

export function ReviewsClient({
  pendingSubmissions,
  allSubmissions,
  users,
}: {
  pendingSubmissions: any[];
  allSubmissions: any[];
  users: any[];
}) {
  const router = useRouter();
  const [feedbackText, setFeedbackText] = useState<Record<string, string>>({});
  const [aiReviewing, setAiReviewing] = useState<string | null>(null);

  async function aiReview(submission: any) {
    setAiReviewing(submission.id);
    try {
      const res = await fetch("/api/ai/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: submission.title,
          type: submission.type,
          description: submission.description,
          projectContext: submission.project?.requirement,
        }),
      });
      const data = await res.json();
      setFeedbackText((prev) => ({ ...prev, [submission.id]: data.feedback }));
    } catch {
      alert("AI review failed");
    } finally {
      setAiReviewing(null);
    }
  }

  async function sendFeedback(submissionId: string) {
    const text = feedbackText[submissionId];
    if (!text) return;
    const res = await fetch(`/api/proxy/v1/submissions/${submissionId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text,
        is_ai: false,
      }),
    });
    const envelope = await res.json().catch(() => null);
    if (!res.ok || envelope?.status !== "success") {
      alert(envelope?.message ?? "Failed to send feedback");
      return;
    }
    setFeedbackText((prev) => ({ ...prev, [submissionId]: "" }));
    router.refresh();
  }

  function SubmissionCard({
    submission,
    showFeedback = false,
  }: {
    submission: any;
    showFeedback?: boolean;
  }) {
    return (
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              {submissionTypeIcons[submission.type]}
              <span className="font-medium text-sm">{submission.title}</span>
              <Badge variant="outline" className="text-xs">
                {submission.type}
              </Badge>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div
                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ backgroundColor: submission.user.avatarColor }}
              >
                {submission.user.name[0]}
              </div>
              {submission.user.name}
              <Clock className="h-3 w-3 ml-1" />
              {format(new Date(submission.createdAt), "MMM d, HH:mm")}
            </div>
          </div>

          <p className="text-sm text-muted-foreground">
            {submission.description}
          </p>

          <div className="flex items-center gap-2 text-xs">
            <Link
              href={`/projects/${submission.project.id}`}
              className="text-blue-400 hover:underline"
            >
              {submission.project.title}
            </Link>
            <span className="text-muted-foreground">
              / {submission.phase.phaseName}
            </span>
          </div>

          {/* Show existing feedback */}
          {showFeedback &&
            submission.feedback?.map((fb: any) => (
              <div key={fb.id} className="p-2 rounded bg-accent/50 text-sm">
                <div className="flex items-center gap-2 mb-1">
                  <MessageSquare className="h-3 w-3" />
                  <span className="font-medium text-xs">
                    {fb.fromUser.name}
                  </span>
                  {fb.isAi && (
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0"
                    >
                      AI
                    </Badge>
                  )}
                </div>
                <p className="text-muted-foreground whitespace-pre-wrap">
                  {fb.text}
                </p>
              </div>
            ))}

          {/* Review actions for pending */}
          {!showFeedback && (
            <div className="space-y-2">
              <Textarea
                value={feedbackText[submission.id] || ""}
                onChange={(e) =>
                  setFeedbackText((prev) => ({
                    ...prev,
                    [submission.id]: e.target.value,
                  }))
                }
                placeholder="Write feedback..."
                className="min-h-[60px] text-sm"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1"
                  onClick={() => aiReview(submission)}
                  disabled={aiReviewing === submission.id}
                >
                  {aiReviewing === submission.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  AI Review
                </Button>
                <Button
                  size="sm"
                  onClick={() => sendFeedback(submission.id)}
                  disabled={!feedbackText[submission.id]}
                >
                  Send Feedback
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Review Queue</h1>
        <p className="text-muted-foreground mt-1">
          Review team submissions and provide feedback
        </p>
      </div>

      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending" className="gap-2">
            Pending
            {pendingSubmissions.length > 0 && (
              <span className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-[10px] font-bold text-white">
                {pendingSubmissions.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-3 mt-4">
          {pendingSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No submissions awaiting review
              </CardContent>
            </Card>
          ) : (
            pendingSubmissions.map((sub) => (
              <SubmissionCard key={sub.id} submission={sub} />
            ))
          )}
        </TabsContent>

        <TabsContent value="all" className="space-y-3 mt-4">
          {allSubmissions.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No submissions yet
              </CardContent>
            </Card>
          ) : (
            allSubmissions.map((sub) => (
              <SubmissionCard
                key={sub.id}
                submission={sub}
                showFeedback={true}
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
