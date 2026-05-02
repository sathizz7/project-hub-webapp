"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  Loader2,
  CheckCircle2,
  Clock,
  Users,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  X,
  Edit3,
  ArrowRightCircle,
  Trash2,
  ListTodo,
  MessageSquare,
  Handshake,
  Video,
  Eye,
  Milestone,
  History,
} from "lucide-react";
import {
  USERS,
  DEPARTMENTS,
  PROJECTS,
  CAPTURE_SESSIONS,
  CaptureSession,
  CaptureItem,
  CaptureItemType,
  addCaptureSession,
  updateCaptureItem,
  dismissCaptureItem,
  convertCaptureItem,
  getPendingCaptureItems,
  addReviewTask,
  addTask,
} from "@/lib/mock-data";
import { parseCaptureInput } from "@/lib/ai-capture-parser";

const TYPE_CONFIG: Record<CaptureItemType, { label: string; color: string; bgColor: string; borderColor: string; icon: typeof ListTodo }> = {
  todo: { label: "To-Do", color: "text-blue-700", bgColor: "bg-blue-50", borderColor: "border-blue-200", icon: ListTodo },
  follow_up: { label: "Follow-Up", color: "text-amber-700", bgColor: "bg-amber-50", borderColor: "border-amber-200", icon: Clock },
  commitment: { label: "Commitment", color: "text-purple-700", bgColor: "bg-purple-50", borderColor: "border-purple-200", icon: Handshake },
  meeting: { label: "Meeting", color: "text-green-700", bgColor: "bg-green-50", borderColor: "border-green-200", icon: Video },
  review_reminder: { label: "Review", color: "text-red-700", bgColor: "bg-red-50", borderColor: "border-red-200", icon: Eye },
  timeline: { label: "Timeline", color: "text-indigo-700", bgColor: "bg-indigo-50", borderColor: "border-indigo-200", icon: Milestone },
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-100 text-red-700 border-red-200",
  high: "bg-amber-100 text-amber-700 border-amber-200",
  medium: "bg-blue-100 text-blue-700 border-blue-200",
  low: "bg-gray-100 text-gray-600 border-gray-200",
};

const EXAMPLE_TEXT = `Assigned API documentation task to Arjun, need it by Friday.
Meeting with data science team on Monday to review the churn model.
Committed to deliver quarterly report to marketing by end of month.
Need to review Sneha's design mockups before Thursday.
Vikram should set up the staging environment by next week.
Deadline for the API gateway launch is April 15th.`;

export default function CapturePage() {
  const [, forceUpdate] = useState(0);
  const [inputText, setInputText] = useState("");
  const [processing, setProcessing] = useState(false);
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDueDate, setEditDueDate] = useState("");
  const [convertingItem, setConvertingItem] = useState<{ sessionId: string; itemId: string } | null>(null);
  const [convertProject, setConvertProject] = useState("");

  const pendingCount = getPendingCaptureItems().length;

  const currentSession = activeSession
    ? CAPTURE_SESSIONS.find(s => s.id === activeSession)
    : CAPTURE_SESSIONS[0] || null;

  const groupedItems = useMemo(() => {
    if (!currentSession) return {};
    const groups: Record<string, CaptureItem[]> = {};
    for (const item of currentSession.items) {
      if (!groups[item.type]) groups[item.type] = [];
      groups[item.type].push(item);
    }
    return groups;
  }, [currentSession, currentSession?.items.map(i => `${i.id}-${i.status}`).join(",")]);

  function handleProcess() {
    if (!inputText.trim()) return;
    setProcessing(true);
    // Simulate AI processing delay
    setTimeout(() => {
      const items = parseCaptureInput(inputText, USERS, DEPARTMENTS);
      const session = addCaptureSession(inputText, items);
      setActiveSession(session.id);
      setInputText("");
      setProcessing(false);
      forceUpdate(p => p + 1);
    }, 1200);
  }

  function handleDismiss(sessionId: string, itemId: string) {
    dismissCaptureItem(sessionId, itemId);
    forceUpdate(p => p + 1);
  }

  function handleStartEdit(item: CaptureItem) {
    setEditingItem(item.id);
    setEditTitle(item.title);
    setEditDueDate(item.dueDate);
  }

  function handleSaveEdit(sessionId: string, itemId: string) {
    updateCaptureItem(sessionId, itemId, { title: editTitle, dueDate: editDueDate });
    setEditingItem(null);
    forceUpdate(p => p + 1);
  }

  function handleConvertToReviewTask(sessionId: string, item: CaptureItem) {
    const project = PROJECTS.find(p => p.id === (item.projectId || "p1"));
    addReviewTask({
      description: item.description,
      assigneeIds: item.assigneeIds.length > 0 ? item.assigneeIds : ["u1"],
      assignedBy: "u1",
      priority: item.priority === "critical" ? "high" : item.priority,
      dueDate: item.dueDate || undefined,
      sourceType: "task",
      sourceTitle: item.title,
      projectId: item.projectId || "p1",
      projectTitle: project?.title || "General",
    });
    convertCaptureItem(sessionId, item.id, "review_task", `rt-${Date.now()}`);
    forceUpdate(p => p + 1);
  }

  function handleConvertToTask(sessionId: string, item: CaptureItem, projectId: string) {
    addTask(projectId, {
      title: item.title,
      description: item.description,
      assigneeIds: item.assigneeIds,
      priority: item.priority === "critical" ? "high" : item.priority,
      status: "planning",
      estimatedHours: 8,
      phaseId: "",
    });
    convertCaptureItem(sessionId, item.id, "project_task", projectId);
    setConvertingItem(null);
    forceUpdate(p => p + 1);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-7 w-7 text-purple-600" />
          AI Capture
        </h1>
        <p className="text-muted-foreground mt-1">
          Dump your notes, messages, meeting takeaways — AI organizes them into actionable items
        </p>
        {pendingCount > 0 && (
          <Badge variant="outline" className="mt-2 bg-amber-50 text-amber-700 border-amber-200">
            {pendingCount} pending item{pendingCount !== 1 ? "s" : ""} to action
          </Badge>
        )}
      </div>

      {/* Input Section */}
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Paste your notes, messages, or voice transcription</span>
          </div>
          <Textarea
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder={EXAMPLE_TEXT}
            rows={6}
            className="resize-none text-sm"
          />
          <div className="flex items-center gap-3">
            <Button
              onClick={handleProcess}
              disabled={!inputText.trim() || processing}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processing...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Process with AI
                </>
              )}
            </Button>
            {inputText.trim() === "" && (
              <button
                className="text-xs text-purple-600 hover:underline"
                onClick={() => setInputText(EXAMPLE_TEXT)}
              >
                Try example input
              </button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Extracted Items */}
      {currentSession && currentSession.items.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              Extracted Items
              <span className="text-sm font-normal text-muted-foreground ml-2">
                {currentSession.items.length} item{currentSession.items.length !== 1 ? "s" : ""} from your input
              </span>
            </h2>
            <div className="flex items-center gap-2">
              {CAPTURE_SESSIONS.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowHistory(!showHistory)}
                >
                  <History className="h-3.5 w-3.5 mr-1" />
                  History ({CAPTURE_SESSIONS.length})
                  {showHistory ? <ChevronDown className="h-3.5 w-3.5 ml-1" /> : <ChevronRight className="h-3.5 w-3.5 ml-1" />}
                </Button>
              )}
            </div>
          </div>

          {/* History panel */}
          {showHistory && (
            <Card className="border-dashed">
              <CardContent className="pt-4 space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase">Past Sessions</p>
                {CAPTURE_SESSIONS.map(session => (
                  <button
                    key={session.id}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      session.id === activeSession ? "border-purple-300 bg-purple-50" : "border-gray-200 hover:bg-gray-50"
                    }`}
                    onClick={() => { setActiveSession(session.id); setShowHistory(false); }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium truncate max-w-[70%]">
                        {session.rawInput.substring(0, 80)}...
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px]">
                          {session.items.length} items
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(session.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-1 mt-1.5">
                      {Object.entries(
                        session.items.reduce((acc, i) => {
                          acc[i.type] = (acc[i.type] || 0) + 1;
                          return acc;
                        }, {} as Record<string, number>)
                      ).map(([type, count]) => (
                        <Badge
                          key={type}
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 ${TYPE_CONFIG[type as CaptureItemType]?.bgColor} ${TYPE_CONFIG[type as CaptureItemType]?.color} ${TYPE_CONFIG[type as CaptureItemType]?.borderColor}`}
                        >
                          {count} {TYPE_CONFIG[type as CaptureItemType]?.label}
                        </Badge>
                      ))}
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Grouped items by type */}
          {(["todo", "follow_up", "commitment", "meeting", "review_reminder", "timeline"] as CaptureItemType[]).map(type => {
            const items = groupedItems[type];
            if (!items || items.length === 0) return null;
            const config = TYPE_CONFIG[type];
            const Icon = config.icon;

            return (
              <div key={type} className="space-y-2">
                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${config.bgColor} border ${config.borderColor}`}>
                  <Icon className={`h-4 w-4 ${config.color}`} />
                  <span className={`text-sm font-semibold ${config.color}`}>
                    {config.label}s
                  </span>
                  <Badge variant="outline" className={`text-[10px] ml-auto ${config.color} ${config.borderColor}`}>
                    {items.length}
                  </Badge>
                </div>

                {items.map(item => {
                  const isEditing = editingItem === item.id;
                  const isDismissed = item.status === "dismissed";
                  const isConverted = item.status === "converted";
                  const isConvertDialog = convertingItem?.itemId === item.id;
                  const assignees = USERS.filter(u => item.assigneeIds.includes(u.id));

                  return (
                    <Card
                      key={item.id}
                      className={`transition-all ${
                        isDismissed ? "opacity-40" : isConverted ? "opacity-60 border-green-200 bg-green-50/30" : ""
                      }`}
                    >
                      <CardContent className="pt-4 pb-3">
                        {isConverted && (
                          <div className="flex items-center gap-1 text-green-600 text-xs mb-2">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Converted to {item.convertedTo?.type.replace("_", " ")}
                          </div>
                        )}

                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            {isEditing ? (
                              <div className="space-y-2">
                                <Input
                                  value={editTitle}
                                  onChange={e => setEditTitle(e.target.value)}
                                  className="text-sm font-medium"
                                />
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-muted-foreground">Due:</span>
                                  <Input
                                    type="date"
                                    value={editDueDate}
                                    onChange={e => setEditDueDate(e.target.value)}
                                    className="text-xs w-40"
                                  />
                                </div>
                                <div className="flex gap-2">
                                  <Button size="sm" onClick={() => handleSaveEdit(currentSession!.id, item.id)}>
                                    Save
                                  </Button>
                                  <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>
                                    Cancel
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <p className="text-sm font-medium">{item.title}</p>
                                <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                                  {item.rawText}
                                </p>

                                {/* Meta row */}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {assignees.length > 0 && (
                                    <div className="flex items-center gap-1">
                                      {assignees.map(u => (
                                        <div
                                          key={u.id}
                                          className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                          style={{ backgroundColor: u.avatarColor }}
                                          title={u.name}
                                        >
                                          {u.name[0]}
                                        </div>
                                      ))}
                                      <span className="text-xs text-muted-foreground">
                                        {assignees.map(u => u.name).join(", ")}
                                      </span>
                                    </div>
                                  )}
                                  {item.department && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-600 border-purple-200">
                                      <Building2 className="h-2.5 w-2.5 mr-0.5" />
                                      {item.department}
                                    </Badge>
                                  )}
                                  {item.dueDate && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                                      <CalendarDays className="h-2.5 w-2.5 mr-0.5" />
                                      {new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                                    </Badge>
                                  )}
                                  <Badge variant="outline" className={`text-[10px] px-1.5 py-0 ${PRIORITY_COLORS[item.priority]}`}>
                                    {item.priority}
                                  </Badge>
                                </div>
                              </>
                            )}
                          </div>

                          {/* Actions */}
                          {item.status === "pending" && !isEditing && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                                title="Edit"
                                onClick={() => handleStartEdit(item)}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                                title="Convert"
                                onClick={() => setConvertingItem({ sessionId: currentSession!.id, itemId: item.id })}
                              >
                                <ArrowRightCircle className="h-3.5 w-3.5" />
                              </button>
                              <button
                                className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"
                                title="Dismiss"
                                onClick={() => handleDismiss(currentSession!.id, item.id)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Convert dialog */}
                        {isConvertDialog && (
                          <div className="mt-3 p-3 rounded-lg border border-blue-200 bg-blue-50/50 space-y-3">
                            <p className="text-xs font-medium text-blue-700">Convert this item to:</p>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-xs"
                                onClick={() => {
                                  handleConvertToReviewTask(currentSession!.id, item);
                                  setConvertingItem(null);
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                Review Task
                              </Button>
                              <div className="flex items-center gap-1">
                                <select
                                  className="text-xs border rounded px-2 py-1.5 bg-white"
                                  value={convertProject}
                                  onChange={e => setConvertProject(e.target.value)}
                                >
                                  <option value="">Select project...</option>
                                  {PROJECTS.map(p => (
                                    <option key={p.id} value={p.id}>{p.title}</option>
                                  ))}
                                </select>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-xs"
                                  disabled={!convertProject}
                                  onClick={() => handleConvertToTask(currentSession!.id, item, convertProject)}
                                >
                                  <ListTodo className="h-3 w-3 mr-1" />
                                  Project Task
                                </Button>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-muted-foreground"
                              onClick={() => setConvertingItem(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state when no sessions */}
      {CAPTURE_SESSIONS.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="pt-8 pb-8 text-center">
            <Sparkles className="h-10 w-10 text-purple-300 mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              Paste your notes above and click &quot;Process with AI&quot; to get started
            </p>
            <p className="text-muted-foreground text-xs mt-1">
              AI will extract to-dos, follow-ups, commitments, meetings, and more
            </p>
          </CardContent>
        </Card>
      )}

      {/* Summary stats */}
      {CAPTURE_SESSIONS.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(["todo", "follow_up", "meeting", "commitment"] as CaptureItemType[]).map(type => {
            const config = TYPE_CONFIG[type];
            const Icon = config.icon;
            const count = CAPTURE_SESSIONS.flatMap(s => s.items).filter(i => i.type === type && i.status === "pending").length;
            return (
              <Card key={type}>
                <CardContent className="pt-4 pb-3 flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${config.bgColor}`}>
                    <Icon className={`h-4 w-4 ${config.color}`} />
                  </div>
                  <div>
                    <p className="text-lg font-bold">{count}</p>
                    <p className="text-[10px] text-muted-foreground">Pending {config.label}s</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
