"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  ClipboardCheck,
  Code,
  FileText,
  BookOpen,
  Presentation,
  MessageSquare,
  Users,
  Sparkles,
  Loader2,
  Send,
  ArrowRight,
  CheckCircle2,
  Clock,
} from "lucide-react";
import {
  PROJECTS,
  USERS,
  getUser,
  getPendingReviews,
  type Update,
  type Project,
} from "@/lib/mock-data";
import { formatDistanceToNow } from "date-fns";

const typeIcons: Record<string, React.ReactNode> = {
  code: <Code className="h-4 w-4 text-blue-600" />,
  architecture: <FileText className="h-4 w-4 text-purple-600" />,
  notebook: <BookOpen className="h-4 w-4 text-amber-600" />,
  document: <FileText className="h-4 w-4 text-green-600" />,
  demo: <Presentation className="h-4 w-4 text-pink-600" />,
  status_update: <MessageSquare className="h-4 w-4 text-slate-500" />,
  meeting_notes: <Users className="h-4 w-4 text-cyan-600" />,
};

const typeBadgeColors: Record<string, string> = {
  code: "text-blue-700 border-blue-200 bg-blue-50",
  architecture: "text-purple-700 border-purple-200 bg-purple-50",
  notebook: "text-amber-700 border-amber-200 bg-amber-50",
  document: "text-green-700 border-green-200 bg-green-50",
  demo: "text-pink-700 border-pink-200 bg-pink-50",
  status_update: "text-slate-700 border-slate-200 bg-slate-50",
  meeting_notes: "text-cyan-700 border-cyan-200 bg-cyan-50",
};

const MOCK_AI_FEEDBACK: Record<string, { text: string; actionItems: string[] }> = {
  default: {
    text: "This submission demonstrates solid technical work. The implementation approach is well-structured and follows established patterns. A few areas to consider:\n\n1. Add more comprehensive error handling for edge cases\n2. Consider adding performance benchmarks to validate against targets\n3. Documentation could be expanded with usage examples",
    actionItems: [
      "Add error handling for network timeout scenarios",
      "Include benchmark results in the PR description",
      "Add inline code comments for complex logic sections",
    ],
  },
  code: {
    text: "The code changes look clean and well-organized. The implementation follows project conventions. Key observations:\n\n1. Test coverage appears adequate for the core paths\n2. Consider edge cases around concurrent access patterns\n3. The fallback mechanism is a good defensive pattern",
    actionItems: [
      "Add integration test for concurrent request handling",
      "Document the fallback behavior in the README",
      "Consider adding structured logging for debugging",
    ],
  },
  notebook: {
    text: "Strong analytical work with clear methodology. The findings are actionable and well-supported by data. Suggestions:\n\n1. Validate findings with a holdout dataset to confirm generalizability\n2. Consider visualizing the key feature importances\n3. The business implications section could be expanded",
    actionItems: [
      "Run validation on a separate holdout set",
      "Add SHAP summary plots for top features",
      "Quantify potential business impact in dollar terms",
    ],
  },
};

function getProjectForUpdate(update: Update): Project | undefined {
  return PROJECTS.find((p) =>
    p.updates.some((u) => u.id === update.id)
  );
}

export default function ReviewsPage() {
  const [activeTab, setActiveTab] = useState("pending");
  const [feedbackTexts, setFeedbackTexts] = useState<Record<string, string>>({});
  const [aiLoading, setAiLoading] = useState<Record<string, boolean>>({});
  const [aiActionItems, setAiActionItems] = useState<Record<string, string[]>>({});
  const [sentFeedback, setSentFeedback] = useState<Set<string>>(new Set());

  // Filter & sort state
  const [filterProject, setFilterProject] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterSubmitter, setFilterSubmitter] = useState("all");
  const [sortDirection, setSortDirection] = useState<"newest" | "oldest">("newest");

  const allSubmissionTypes: Update["type"][] = [
    "code", "document", "architecture", "notebook", "demo", "status_update", "meeting_notes",
  ];

  const rawPendingReviews = useMemo(() => getPendingReviews(), []);
  const rawAllUpdates = useMemo(
    () => PROJECTS.flatMap((p) => p.updates),
    []
  );

  // Build a map from update id to project id for filtering
  const updateProjectMap = useMemo(() => {
    const map: Record<string, string> = {};
    PROJECTS.forEach((p) => p.updates.forEach((u) => { map[u.id] = p.id; }));
    return map;
  }, []);

  const applyFiltersAndSort = (updates: Update[]) => {
    let result = updates;
    if (filterProject !== "all") {
      result = result.filter((u) => updateProjectMap[u.id] === filterProject);
    }
    if (filterType !== "all") {
      result = result.filter((u) => u.type === filterType);
    }
    if (filterSubmitter !== "all") {
      result = result.filter((u) => u.userId === filterSubmitter);
    }
    result = [...result].sort((a, b) => {
      const diff = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortDirection === "newest" ? diff : -diff;
    });
    return result;
  };

  const pendingReviews = useMemo(
    () => applyFiltersAndSort(rawPendingReviews),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawPendingReviews, filterProject, filterType, filterSubmitter, sortDirection]
  );
  const allUpdates = useMemo(
    () => applyFiltersAndSort(rawAllUpdates),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawAllUpdates, filterProject, filterType, filterSubmitter, sortDirection]
  );

  const handleAiReview = (updateId: string, updateType: string) => {
    setAiLoading((prev) => ({ ...prev, [updateId]: true }));
    setTimeout(() => {
      const feedback =
        MOCK_AI_FEEDBACK[updateType] || MOCK_AI_FEEDBACK.default;
      setFeedbackTexts((prev) => ({ ...prev, [updateId]: feedback.text }));
      setAiActionItems((prev) => ({
        ...prev,
        [updateId]: feedback.actionItems,
      }));
      setAiLoading((prev) => ({ ...prev, [updateId]: false }));
    }, 1000);
  };

  const handleSendFeedback = (updateId: string) => {
    setSentFeedback((prev) => new Set(prev).add(updateId));
  };

  const renderUpdateCard = (update: Update, isPending: boolean) => {
    const user = getUser(update.userId);
    const project = getProjectForUpdate(update);
    const isSent = sentFeedback.has(update.id);

    return (
      <Card
        key={update.id}
        className={`transition-colors ${
          isSent ? "border-green-200 bg-green-50" : ""
        }`}
      >
        <CardContent className="pt-5 space-y-4">
          {/* Header */}
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{typeIcons[update.type] || typeIcons.document}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-medium text-sm">{update.title}</h3>
                <Badge
                  variant="outline"
                  className={typeBadgeColors[update.type] || ""}
                >
                  {update.type.replace(/_/g, " ")}
                </Badge>
                {update.reviewed || isSent ? (
                  <Badge
                    variant="outline"
                    className="text-green-700 border-green-200 bg-green-50"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Reviewed
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="text-amber-700 border-amber-200 bg-amber-50"
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Pending
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                {user && (
                  <span className="flex items-center gap-1">
                    <div
                      className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.name[0]}
                    </div>
                    {user.name}
                  </span>
                )}
                <span>
                  {formatDistanceToNow(new Date(update.createdAt), {
                    addSuffix: true,
                  })}
                </span>
                {project && (
                  <Link
                    href={`/projects/${project.id}`}
                    className="text-blue-600 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {project.title}
                  </Link>
                )}
              </div>
            </div>
          </div>

          {/* Description */}
          {update.description && (
            <p className="text-sm text-muted-foreground pl-7 whitespace-pre-line line-clamp-3">
              {update.description}
            </p>
          )}

          {/* Status update details */}
          {update.type === "status_update" && (
            <div className="pl-7 space-y-2 text-sm">
              {update.whatWasDone && (
                <div>
                  <span className="text-muted-foreground">Done: </span>
                  <span>{update.whatWasDone}</span>
                </div>
              )}
              {update.blockers && (
                <div>
                  <span className="text-amber-600">Blockers: </span>
                  <span>{update.blockers}</span>
                </div>
              )}
              {update.nextSteps && (
                <div>
                  <span className="text-blue-600">Next: </span>
                  <span>{update.nextSteps}</span>
                </div>
              )}
            </div>
          )}

          {/* Existing feedback */}
          {update.feedback && update.feedback.length > 0 && (
            <div className="pl-7 space-y-2">
              {update.feedback.map((fb) => {
                const fbUser = getUser(fb.fromUserId);
                return (
                  <div
                    key={fb.id}
                    className="p-3 rounded-lg bg-gray-100 border border-border"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      {fbUser && (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                            style={{
                              backgroundColor: fbUser.avatarColor,
                            }}
                          >
                            {fbUser.name[0]}
                          </div>
                          <span className="text-xs font-medium">
                            {fbUser.name}
                          </span>
                        </div>
                      )}
                      {fb.isAi && (
                        <Badge variant="secondary" className="text-[10px]">
                          <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                          AI
                        </Badge>
                      )}
                      <span className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(fb.createdAt), {
                          addSuffix: true,
                        })}
                      </span>
                    </div>
                    <p className="text-sm whitespace-pre-line">{fb.text}</p>
                    {fb.actionItems && fb.actionItems.length > 0 && (
                      <div className="mt-2 space-y-1">
                        {fb.actionItems.map((item, i) => (
                          <div
                            key={i}
                            className="flex items-center gap-1.5 text-xs"
                          >
                            <ArrowRight className="h-3 w-3 text-blue-600 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Feedback form for pending */}
          {isPending && !isSent && (
            <div className="pl-7 space-y-3">
              <Separator />
              <Textarea
                placeholder="Write your feedback..."
                value={feedbackTexts[update.id] || ""}
                onChange={(e) =>
                  setFeedbackTexts((prev) => ({
                    ...prev,
                    [update.id]: e.target.value,
                  }))
                }
                rows={4}
              />

              {/* AI suggested action items */}
              {aiActionItems[update.id] &&
                aiActionItems[update.id].length > 0 && (
                  <div className="p-3 rounded-lg border border-blue-200 bg-blue-50">
                    <p className="text-xs font-medium text-blue-600 mb-2 flex items-center gap-1.5">
                      <Sparkles className="h-3 w-3" />
                      AI Suggested Action Items
                    </p>
                    <div className="space-y-1.5">
                      {aiActionItems[update.id].map((item, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-1.5 text-sm"
                        >
                          <ArrowRight className="h-3 w-3 text-blue-600 shrink-0" />
                          <span>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={aiLoading[update.id]}
                  onClick={() => handleAiReview(update.id, update.type)}
                >
                  {aiLoading[update.id] ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Reviewing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />
                      AI Review
                    </>
                  )}
                </Button>
                <Button
                  size="sm"
                  className="gap-1.5"
                  disabled={!feedbackTexts[update.id]?.trim()}
                  onClick={() => handleSendFeedback(update.id)}
                >
                  <Send className="h-3.5 w-3.5" />
                  Send Feedback
                </Button>
              </div>
            </div>
          )}

          {/* Sent confirmation */}
          {isSent && (
            <div className="pl-7 flex items-center gap-2 text-sm text-green-600">
              <CheckCircle2 className="h-4 w-4" />
              Feedback sent successfully
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-amber-600" />
          Review Queue
        </h1>
        <p className="text-muted-foreground mt-1">
          Review team submissions and provide feedback
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={filterProject}
          onChange={(e) => setFilterProject(e.target.value)}
          className="text-xs border rounded px-2 py-1.5 bg-white"
        >
          <option value="all">All Projects</option>
          {PROJECTS.map((p) => (
            <option key={p.id} value={p.id}>{p.title}</option>
          ))}
        </select>

        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="text-xs border rounded px-2 py-1.5 bg-white"
        >
          <option value="all">All Types</option>
          {allSubmissionTypes.map((t) => (
            <option key={t} value={t}>{t.replace(/_/g, " ")}</option>
          ))}
        </select>

        <select
          value={filterSubmitter}
          onChange={(e) => setFilterSubmitter(e.target.value)}
          className="text-xs border rounded px-2 py-1.5 bg-white"
        >
          <option value="all">All Team</option>
          {USERS.map((u) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          value={sortDirection}
          onChange={(e) => setSortDirection(e.target.value as "newest" | "oldest")}
          className="text-xs border rounded px-2 py-1.5 bg-white ml-auto"
        >
          <option value="newest">Newest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => v && setActiveTab(v)}>
        <TabsList>
          <TabsTrigger value="pending">
            Pending
            {pendingReviews.length > 0 && (
              <span className="ml-1.5 flex items-center justify-center h-5 min-w-[20px] rounded-full bg-amber-500 text-[10px] font-bold text-white px-1.5">
                {pendingReviews.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">All Submissions</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4 space-y-4">
          {pendingReviews.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <p>All caught up! No pending reviews.</p>
            </div>
          ) : (
            pendingReviews.map((update) => renderUpdateCard(update, true))
          )}
        </TabsContent>

        <TabsContent value="all" className="mt-4 space-y-4">
          {allUpdates.map((update) => renderUpdateCard(update, false))}
        </TabsContent>
      </Tabs>
    </div>
  );
}
