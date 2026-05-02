"use client";

import { useState, useMemo, useRef, useEffect } from "react";
import Link from "next/link";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  FolderKanban, ClipboardCheck, CheckCircle2, Users, AlertTriangle, Clock,
  Sparkles, ArrowRight, TrendingUp, ShieldAlert, Lightbulb, Zap, BarChart3,
  X, Filter, User, CalendarClock, Activity, Target, FileCheck, ListChecks,
  Pencil, Calendar, ArrowLeftRight, Save, History, Search, ClipboardList,
  FileText, Code2, Presentation, MessageSquare, Database, Package,
  Star, ExternalLink, Eye, ChevronDown, ChevronUp, Trophy, ShieldCheck,
  Sun,
} from "lucide-react";
import {
  PROJECTS, USERS, AI_INSIGHTS, getPendingReviews, getPhaseProgress,
  getDaysRemaining, getMilestoneProgress, getUser, getReviewTasksByUser,
  getPendingCaptureItems, getPendingLeaves, CAPTURE_SESSIONS,
} from "@/lib/mock-data";
import type { Task, TaskMilestone, Deliverable, TaskUpdate, Project, TaskStep, ReviewTask, IntermediateSubmission, DeliverableType } from "@/lib/mock-data";
import { format } from "date-fns";

// ---- constants ----

const insightIcons: Record<string, React.ReactNode> = {
  risk: <ShieldAlert className="h-4 w-4 text-red-600" />,
  blocker: <AlertTriangle className="h-4 w-4 text-red-600" />,
  opportunity: <TrendingUp className="h-4 w-4 text-green-600" />,
  suggestion: <Lightbulb className="h-4 w-4 text-amber-600" />,
  performance: <Zap className="h-4 w-4 text-blue-600" />,
};

const insightBorders: Record<string, string> = {
  risk: "border-red-200 bg-red-50",
  blocker: "border-red-200 bg-red-50",
  opportunity: "border-green-200 bg-green-50",
  suggestion: "border-amber-200 bg-amber-50",
  performance: "border-blue-200 bg-blue-50",
};

const priorityColors: Record<string, string> = {
  low: "bg-slate-600", medium: "bg-blue-600", high: "bg-amber-600", critical: "bg-red-600",
};
const typeColors: Record<string, string> = {
  engineering: "text-blue-700 border-blue-200 bg-blue-50",
  research: "text-purple-700 border-purple-200 bg-purple-50",
  mixed: "text-teal-700 border-teal-200 bg-teal-50",
  data_science: "text-violet-700 border-violet-200 bg-violet-50",
  design: "text-pink-700 border-pink-200 bg-pink-50",
  sales: "text-orange-700 border-orange-200 bg-orange-50",
  marketing: "text-rose-700 border-rose-200 bg-rose-50",
  operations: "text-slate-700 border-slate-200 bg-slate-50",
  hr: "text-cyan-700 border-cyan-200 bg-cyan-50",
  legal: "text-gray-700 border-gray-200 bg-gray-50",
  strategy: "text-indigo-700 border-indigo-200 bg-indigo-50",
  product: "text-emerald-700 border-emerald-200 bg-emerald-50",
  finance: "text-amber-700 border-amber-200 bg-amber-50",
};

const typeLabels: Record<string, string> = {
  engineering: "Engineering",
  research: "Research/DS",
  mixed: "Mixed",
  data_science: "Data Science",
  design: "Design",
  sales: "Sales",
  marketing: "Marketing",
  operations: "Operations",
  hr: "HR",
  legal: "Legal",
  strategy: "Strategy",
  product: "Product",
  finance: "Finance",
};
const statusColors: Record<string, string> = {
  active: "text-emerald-700 border-emerald-200 bg-emerald-50",
  completed: "text-green-700 border-green-200 bg-green-50",
  killed: "text-red-700 border-red-200 bg-red-50",
  paused: "text-amber-700 border-amber-200 bg-amber-50",
};

const PERSON_FILTER_PILL_THRESHOLD = 6;

const categoryColors: Record<string, string> = {
  design: "bg-purple-100 text-purple-700 border-purple-200",
  development: "bg-blue-100 text-blue-700 border-blue-200",
  review: "bg-amber-100 text-amber-700 border-amber-200",
  testing: "bg-green-100 text-green-700 border-green-200",
  deployment: "bg-red-100 text-red-700 border-red-200",
  documentation: "bg-cyan-100 text-cyan-700 border-cyan-200",
  research: "bg-indigo-100 text-indigo-700 border-indigo-200",
  integration: "bg-teal-100 text-teal-700 border-teal-200",
};

const deliverableTypeConfig: Record<DeliverableType, { icon: React.ReactNode; label: string; color: string }> = {
  code: { icon: <Code2 className="h-3 w-3" />, label: "Code", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  document: { icon: <FileText className="h-3 w-3" />, label: "Document", color: "text-blue-700 bg-blue-50 border-blue-200" },
  ppt: { icon: <Presentation className="h-3 w-3" />, label: "Presentation", color: "text-orange-700 bg-orange-50 border-orange-200" },
  text: { icon: <MessageSquare className="h-3 w-3" />, label: "Text", color: "text-cyan-700 bg-cyan-50 border-cyan-200" },
  meeting_notes: { icon: <Users className="h-3 w-3" />, label: "Meeting Notes", color: "text-teal-700 bg-teal-50 border-teal-200" },
  data: { icon: <Database className="h-3 w-3" />, label: "Data", color: "text-purple-700 bg-purple-50 border-purple-200" },
};

const TIME_PERIOD_OPTIONS = ["All Time", "Yesterday", "This Week", "This Month"] as const;
type TimePeriod = (typeof TIME_PERIOD_OPTIONS)[number];

const STATUS_OPTIONS = ["All", "In Progress", "Blocked", "Completed", "Planning"] as const;
const PRIORITY_OPTIONS = ["All", "High", "Medium", "Low"] as const;
const DEADLINE_OPTIONS = ["All", "Overdue", "Due This Week", "Due Next Week"] as const;

type StatusFilter = (typeof STATUS_OPTIONS)[number];
type PriorityFilter = (typeof PRIORITY_OPTIONS)[number];
type DeadlineFilter = (typeof DEADLINE_OPTIONS)[number];

// map display labels to task status values
const statusMap: Record<string, string> = {
  "In Progress": "in_progress",
  "Blocked": "blocked",
  "Completed": "completed",
  "Planning": "planning",
};
const priorityMap: Record<string, string> = {
  "High": "high",
  "Medium": "medium",
  "Low": "low",
};

// ---- helpers ----

function getAllTasks(): Task[] {
  return PROJECTS.flatMap((p) => p.tasks);
}

function getAllMilestones(): { milestone: TaskMilestone; task: Task; project: Project }[] {
  return PROJECTS.flatMap((p) =>
    p.tasks.flatMap((t) =>
      t.milestones.map((m) => ({ milestone: m, task: t, project: p }))
    )
  );
}

function getAllDeliverables(): { deliverable: Deliverable; milestone: TaskMilestone; task: Task; project: Project }[] {
  return PROJECTS.flatMap((p) =>
    p.tasks.flatMap((t) =>
      t.milestones.flatMap((m) =>
        m.deliverables.map((d) => ({ deliverable: d, milestone: m, task: t, project: p }))
      )
    )
  );
}

function getRecentActivity(): { id: string; message: string; userId: string; date: string; projectTitle: string; projectId: string; type: string }[] {
  const updates: { id: string; message: string; userId: string; date: string; projectTitle: string; projectId: string; type: string }[] = [];

  // Project-level updates
  for (const p of PROJECTS) {
    for (const u of p.updates) {
      updates.push({
        id: u.id,
        message: u.title,
        userId: u.userId,
        date: u.createdAt,
        projectTitle: p.title,
        projectId: p.id,
        type: u.type,
      });
    }
    // Task-level updates
    for (const t of p.tasks) {
      for (const tu of t.updates) {
        updates.push({
          id: tu.id,
          message: tu.message,
          userId: tu.userId,
          date: tu.createdAt,
          projectTitle: p.title,
          projectId: p.id,
          type: "task_update",
        });
      }
      // Milestone-level updates
      for (const m of t.milestones) {
        for (const mu of m.updates) {
          updates.push({
            id: mu.id,
            message: mu.message,
            userId: mu.userId,
            date: mu.createdAt,
            projectTitle: p.title,
            projectId: p.id,
            type: "milestone_update",
          });
        }
      }
    }
  }

  updates.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  return updates;
}

function isOverdueTask(task: Task): boolean {
  // A task is overdue if its project's timebox is expired and the task isn't completed
  const project = PROJECTS.find((p) => p.tasks.some((t) => t.id === task.id));
  if (!project) return false;
  const daysLeft = getDaysRemaining(project.startDate, project.timeboxDays);
  return daysLeft < 0 && task.status !== "completed";
}

function isDueThisWeek(task: Task): boolean {
  const project = PROJECTS.find((p) => p.tasks.some((t) => t.id === task.id));
  if (!project) return false;
  const daysLeft = getDaysRemaining(project.startDate, project.timeboxDays);
  return daysLeft >= 0 && daysLeft <= 7 && task.status !== "completed";
}

function isDueNextWeek(task: Task): boolean {
  const project = PROJECTS.find((p) => p.tasks.some((t) => t.id === task.id));
  if (!project) return false;
  const daysLeft = getDaysRemaining(project.startDate, project.timeboxDays);
  return daysLeft > 7 && daysLeft <= 14 && task.status !== "completed";
}

// ---- filter pill component ----

function FilterPill({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {label}
    </button>
  );
}

// ---- person pill component ----

function PersonPill({ user, active, onClick }: { user: { id: string; name: string; avatarColor: string; role: string; department: string }; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-all border ${
        active
          ? "bg-blue-600 text-white border-blue-600 shadow-sm"
          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      <div
        className={`h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold ${active ? "text-blue-600 bg-white" : "text-white"}`}
        style={active ? undefined : { backgroundColor: user.avatarColor }}
      >
        {user.name[0]}
      </div>
      {user.name}
      <span className={`text-[10px] ${active ? "text-blue-200" : "text-gray-400"}`}>{user.department}</span>
    </button>
  );
}

// ---- person searchable dropdown component ----

function PersonSearchDropdown({
  users,
  selectedPerson,
  onSelect,
}: {
  users: { id: string; name: string; avatarColor: string; role: string; department: string }[];
  selectedPerson: string | null;
  onSelect: (id: string | null) => void;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const filtered = users.filter(
    (u) =>
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.role.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const selectedUser = selectedPerson ? users.find((u) => u.id === selectedPerson) : null;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className="relative w-full max-w-sm">
      <div className="flex items-center gap-2">
        {selectedUser && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-600 text-white border border-blue-600 shadow-sm">
            <div className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-blue-600 bg-white">
              {selectedUser.name[0]}
            </div>
            {selectedUser.name}
            <button onClick={() => onSelect(null)} className="ml-0.5 hover:bg-blue-700 rounded-full p-0.5">
              <X className="h-3 w-3" />
            </button>
          </div>
        )}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
          <input
            type="text"
            placeholder="Search team member..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setIsOpen(true); }}
            onFocus={() => setIsOpen(true)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-gray-200 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          />
        </div>
      </div>
      {isOpen && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="px-3 py-4 text-xs text-gray-400 text-center">No matching team members</div>
          ) : (
            filtered.map((user) => (
              <button
                key={user.id}
                onClick={() => { onSelect(selectedPerson === user.id ? null : user.id); setIsOpen(false); setSearchQuery(""); }}
                className={`flex items-center gap-2.5 w-full px-3 py-2 text-left hover:bg-gray-50 transition-colors ${
                  selectedPerson === user.id ? "bg-blue-50" : ""
                }`}
              >
                <div
                  className="h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0"
                  style={{ backgroundColor: user.avatarColor }}
                >
                  {user.name[0]}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium truncate">{user.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{user.role} · {user.department}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ---- stat card component ----

function StatCard({ icon, label, value, alert }: { icon: React.ReactNode; label: string; value: number; alert?: boolean }) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold mt-1">{value}</p>
          </div>
          <div className="relative">
            {icon}
            {alert && <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ---- main page component ----

export default function DashboardPage() {
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>("All");
  const [deadlineFilter, setDeadlineFilter] = useState<DeadlineFilter>("All");

  // Daily Work Planner state
  type EditEntry = { column: "today" | "tomorrow"; originalText: string; editedText: string; editedAt: string; editedBy: string };
  const [editingColumn, setEditingColumn] = useState<"today" | "tomorrow" | null>(null);
  const [editText, setEditText] = useState("");
  const [editNote, setEditNote] = useState("");
  const [editHistoryMap, setEditHistoryMap] = useState<Record<string, EditEntry[]>>({});
  const [showDiffColumn, setShowDiffColumn] = useState<"today" | "tomorrow" | null>(null);

  // Per-person edit history
  const editHistory = selectedPerson ? (editHistoryMap[selectedPerson] || []) : [];
  const setEditHistory = (updater: EditEntry[] | ((prev: EditEntry[]) => EditEntry[])) => {
    if (selectedPerson) {
      setEditHistoryMap(prev => ({
        ...prev,
        [selectedPerson!]: typeof updater === "function" ? updater(prev[selectedPerson!] || []) : updater,
      }));
    }
  };

  const hasActiveFilters = selectedPerson !== null || statusFilter !== "All" || priorityFilter !== "All" || deadlineFilter !== "All";

  function selectPerson(id: string | null) {
    setSelectedPerson(id);
    setEditingColumn(null);
    setShowDiffColumn(null);
  }

  function clearFilters() {
    selectPerson(null);
    setStatusFilter("All");
    setPriorityFilter("All");
    setDeadlineFilter("All");
  }

  // ---- filtered data ----

  const filteredTasks = useMemo(() => {
    let tasks = getAllTasks();

    if (selectedPerson) {
      tasks = tasks.filter((t) => t.assigneeId === selectedPerson);
    }
    if (statusFilter !== "All") {
      tasks = tasks.filter((t) => t.status === statusMap[statusFilter]);
    }
    if (priorityFilter !== "All") {
      tasks = tasks.filter((t) => t.priority === priorityMap[priorityFilter]);
    }
    if (deadlineFilter !== "All") {
      if (deadlineFilter === "Overdue") tasks = tasks.filter(isOverdueTask);
      else if (deadlineFilter === "Due This Week") tasks = tasks.filter(isDueThisWeek);
      else if (deadlineFilter === "Due Next Week") tasks = tasks.filter(isDueNextWeek);
    }

    return tasks;
  }, [selectedPerson, statusFilter, priorityFilter, deadlineFilter]);

  const filteredProjects = useMemo(() => {
    if (!hasActiveFilters) return PROJECTS.filter((p) => p.status !== "completed");

    let projects = PROJECTS;

    if (selectedPerson) {
      projects = projects.filter((p) =>
        p.assigneeIds.includes(selectedPerson) ||
        p.tasks.some((t) => t.assigneeId === selectedPerson)
      );
    }

    // For status/priority/deadline, show projects that have at least one matching task
    const matchingTaskIds = new Set(filteredTasks.map((t) => t.id));
    if (statusFilter !== "All" || priorityFilter !== "All" || deadlineFilter !== "All") {
      projects = projects.filter((p) =>
        p.tasks.some((t) => matchingTaskIds.has(t.id))
      );
    }

    return projects;
  }, [selectedPerson, statusFilter, priorityFilter, deadlineFilter, filteredTasks, hasActiveFilters]);

  const filteredMilestones = useMemo(() => {
    let milestones = getAllMilestones();
    if (selectedPerson) {
      milestones = milestones.filter((m) =>
        m.task.assigneeId === selectedPerson || m.milestone.assigneeId === selectedPerson
      );
    }
    if (statusFilter !== "All") {
      milestones = milestones.filter((m) => m.task.status === statusMap[statusFilter]);
    }
    if (priorityFilter !== "All") {
      milestones = milestones.filter((m) => m.task.priority === priorityMap[priorityFilter]);
    }
    return milestones;
  }, [selectedPerson, statusFilter, priorityFilter]);

  const filteredDeliverables = useMemo(() => {
    let deliverables = getAllDeliverables();
    if (selectedPerson) {
      deliverables = deliverables.filter((d) =>
        d.task.assigneeId === selectedPerson ||
        d.deliverable.submittedBy === selectedPerson
      );
    }
    return deliverables.filter((d) => d.deliverable.status === "pending" || d.deliverable.status === "submitted");
  }, [selectedPerson]);

  const recentActivity = useMemo(() => {
    let activity = getRecentActivity();
    if (selectedPerson) {
      activity = activity.filter((a) => a.userId === selectedPerson);
    }
    return activity.slice(0, 7);
  }, [selectedPerson]);

  // ---- daily work planner data ----

  type StepWithContext = { step: TaskStep; task: Task; project: Project };

  const personSteps = useMemo((): StepWithContext[] => {
    if (!selectedPerson) return [];
    return PROJECTS.flatMap((p) =>
      p.tasks
        .filter((t) => t.assigneeId === selectedPerson)
        .flatMap((t) =>
          t.steps.map((s) => ({ step: s, task: t, project: p }))
        )
    );
  }, [selectedPerson]);

  const yesterdayWork = useMemo(() => {
    if (!selectedPerson) return [] as StepWithContext[];
    const yesterday = new Date(Date.now() - 1 * 86400000);
    const yStart = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate()).getTime();
    const yEnd = yStart + 86400000;
    return personSteps.filter(
      (s) => s.step.completedAt && new Date(s.step.completedAt).getTime() >= yStart && new Date(s.step.completedAt).getTime() < yEnd
    );
  }, [selectedPerson, personSteps]);

  const todayWork = useMemo(() => {
    if (!selectedPerson) return [] as StepWithContext[];
    return personSteps.filter((s) => s.step.status === "in_progress");
  }, [selectedPerson, personSteps]);

  // Review tasks assigned to this person (no useMemo — reads mutable store each render)
  const personReviewTasks = selectedPerson ? getReviewTasksByUser(selectedPerson) : ([] as ReviewTask[]);

  const tomorrowWork = useMemo(() => {
    if (!selectedPerson) return [] as StepWithContext[];
    const allStepIds = new Set(personSteps.map((s) => s.step.id));
    const completedOrInProgressIds = new Set(
      personSteps.filter((s) => s.step.status === "completed" || s.step.status === "in_progress").map((s) => s.step.id)
    );
    return personSteps.filter((s) => {
      if (s.step.status !== "pending") return false;
      // Next in sequence: depends on completed or in_progress steps
      if (s.step.dependencies && s.step.dependencies.length > 0) {
        return s.step.dependencies.some((depId) => completedOrInProgressIds.has(depId));
      }
      // Or follows an in_progress step in the same task (by array position)
      const taskSteps = personSteps.filter((ps) => ps.task.id === s.task.id);
      const idx = taskSteps.findIndex((ts) => ts.step.id === s.step.id);
      if (idx > 0) {
        const prevStep = taskSteps[idx - 1];
        return prevStep.step.status === "in_progress" || prevStep.step.status === "completed";
      }
      return false;
    });
  }, [selectedPerson, personSteps]);

  // ---- contributions & deliverables tracking ----

  const [contributionPeriod, setContributionPeriod] = useState<TimePeriod>("All Time");
  const [expandedContribution, setExpandedContribution] = useState<string | null>(null);

  type ContributionItem = {
    id: string;
    title: string;
    description: string;
    type: "deliverable" | "intermediate_submission" | "completed_step" | "completed_task";
    deliverableType?: DeliverableType;
    status: string;
    date: string;
    projectTitle: string;
    projectId: string;
    taskTitle?: string;
    url?: string;
    feedback?: string;
    verifiedBy?: string;
    reviewedBy?: string;
    isKeyMilestone?: boolean;
  };

  const personContributions = useMemo((): ContributionItem[] => {
    if (!selectedPerson) return [];
    const items: ContributionItem[] = [];

    for (const p of PROJECTS) {
      // 1. Intermediate submissions by this person
      for (const sub of (p.intermediateSubmissions || [])) {
        if (sub.submittedBy === selectedPerson) {
          items.push({
            id: `is-${sub.id}`,
            title: sub.title,
            description: sub.description,
            type: "intermediate_submission",
            deliverableType: sub.type,
            status: sub.status,
            date: sub.submittedAt,
            projectTitle: p.title,
            projectId: p.id,
            url: sub.url,
            feedback: sub.feedback,
            reviewedBy: sub.reviewedBy,
            isKeyMilestone: sub.isKeyMilestone,
          });
        }
      }

      for (const t of p.tasks) {
        // 2. Milestone deliverables submitted by this person
        for (const m of t.milestones) {
          for (const d of m.deliverables) {
            if (d.submittedBy === selectedPerson) {
              items.push({
                id: `del-${d.id}`,
                title: d.title,
                description: d.description || `${d.type} deliverable for ${m.title}`,
                type: "deliverable",
                deliverableType: d.type,
                status: d.status,
                date: d.submittedAt || d.createdAt,
                projectTitle: p.title,
                projectId: p.id,
                taskTitle: t.title,
                url: d.documentUrl || d.codePrUrl || d.codeRepoUrl,
                feedback: d.feedback,
                verifiedBy: d.verifiedBy,
              });
            }
          }
        }

        // 3. Completed task steps by this person
        if (t.assigneeId === selectedPerson) {
          for (const s of t.steps) {
            if (s.status === "completed" && s.completedAt) {
              items.push({
                id: `step-${s.id}`,
                title: s.description,
                description: s.expectedOutcome,
                type: "completed_step",
                status: s.reviewStatus || "completed",
                date: s.completedAt,
                projectTitle: p.title,
                projectId: p.id,
                taskTitle: t.title,
              });
            }
          }

          // 4. Completed tasks
          if (t.status === "completed") {
            items.push({
              id: `task-${t.id}`,
              title: t.title,
              description: t.successCriteria?.join(", ") || t.description,
              type: "completed_task",
              status: "completed",
              date: t.steps.filter(s => s.completedAt).sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime())[0]?.completedAt || p.startDate,
              projectTitle: p.title,
              projectId: p.id,
            });
          }
        }
      }
    }

    // Sort by date descending
    items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return items;
  }, [selectedPerson]);

  const filteredContributions = useMemo(() => {
    if (contributionPeriod === "All Time") return personContributions;
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    let startDate: Date;
    if (contributionPeriod === "Yesterday") {
      startDate = new Date(today.getTime() - 86400000);
    } else if (contributionPeriod === "This Week") {
      const dayOfWeek = today.getDay();
      startDate = new Date(today.getTime() - dayOfWeek * 86400000);
    } else {
      // This Month
      startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    return personContributions.filter(c => new Date(c.date).getTime() >= startDate.getTime());
  }, [personContributions, contributionPeriod]);

  // Summary stats for contributions
  const contributionSummary = useMemo(() => {
    const items = filteredContributions;
    return {
      total: items.length,
      deliverables: items.filter(i => i.type === "deliverable").length,
      submissions: items.filter(i => i.type === "intermediate_submission").length,
      completedSteps: items.filter(i => i.type === "completed_step").length,
      completedTasks: items.filter(i => i.type === "completed_task").length,
      approved: items.filter(i => i.status === "approved" || i.status === "verified").length,
      byType: Object.entries(
        items.filter(i => i.deliverableType).reduce((acc, i) => {
          const t = i.deliverableType!;
          acc[t] = (acc[t] || 0) + 1;
          return acc;
        }, {} as Record<string, number>)
      ),
    };
  }, [filteredContributions]);

  // ---- computed stats ----

  const activeProjectsCount = filteredProjects.filter((p) => p.status === "active").length;
  const completedTasksCount = filteredTasks.filter((t) => t.status === "completed").length;
  const pendingReviews = getPendingReviews();
  const filteredPendingReviews = selectedPerson
    ? pendingReviews.filter((u) => u.userId === selectedPerson)
    : pendingReviews;
  const blockedTasksCount = filteredTasks.filter((t) => t.status === "blocked").length;

  const selectedUser = selectedPerson ? getUser(selectedPerson) : null;

  // person-specific stats
  const personAssignedTasks = selectedPerson ? filteredTasks.length : 0;
  const personCompletedTasks = selectedPerson ? filteredTasks.filter((t) => t.status === "completed").length : 0;
  const personPendingMilestones = selectedPerson
    ? filteredMilestones.filter((m) => m.milestone.status !== "completed").length
    : 0;
  const personEstimatedHours = selectedPerson
    ? filteredTasks.reduce((sum, t) => sum + (t.revisedEstimateHours ?? t.estimatedHours), 0)
    : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Command Center</h1>
        <p className="text-muted-foreground mt-1">Your projects, team, and AI-powered insights at a glance</p>
      </div>

      {/* My Day */}
      {(() => {
        const pendingReviewsList = getPendingReviews();
        const pendingCaptureList = getPendingCaptureItems();
        const pendingLeavesList = getPendingLeaves();
        const blockedTasks = PROJECTS.flatMap(p => p.tasks).filter(t => t.status === "blocked");
        const overdueProjects = PROJECTS.filter(p => p.status === "active" && getDaysRemaining(p.startDate, p.timeboxDays) < 0);
        const upcomingDeadlines = PROJECTS.filter(p => {
          const days = getDaysRemaining(p.startDate, p.timeboxDays);
          return p.status === "active" && days >= 0 && days <= 7;
        });
        const totalItems = pendingReviewsList.length + pendingCaptureList.length + pendingLeavesList.length + blockedTasks.length + overdueProjects.length + upcomingDeadlines.length;

        return (
          <Card className="border-blue-200 bg-gradient-to-br from-blue-50/60 to-indigo-50/40">
            <CardContent className="pt-5 pb-5">
              {/* Header with date */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-sm">
                    <Sun className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">My Day</h2>
                    <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d, yyyy")}</p>
                  </div>
                </div>
                {totalItems > 0 && (
                  <Badge className="bg-blue-600 text-white text-xs px-2.5 py-1">
                    {totalItems} item{totalItems !== 1 ? "s" : ""} today
                  </Badge>
                )}
              </div>

              {totalItems === 0 ? (
                <div className="text-center py-4 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                  All clear! Nothing needs your attention today.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Reviews to Complete */}
                  {pendingReviewsList.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-amber-600" />
                        <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Reviews to Complete</span>
                        <Badge variant="outline" className="text-[10px] bg-amber-100 text-amber-700 border-amber-300 ml-auto">{pendingReviewsList.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {pendingReviewsList.slice(0, 4).map(review => {
                          const submitter = getUser(review.userId);
                          return (
                            <Link
                              key={review.id}
                              href={`/projects/${review.projectId}`}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/70 border border-amber-100 hover:border-amber-300 hover:bg-white transition-colors group"
                            >
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                style={{ backgroundColor: submitter?.avatarColor ?? "#94a3b8" }}
                              >
                                {submitter?.name[0] ?? "?"}
                              </div>
                              <span className="text-xs text-gray-700 truncate flex-1">{review.title}</span>
                              <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-amber-600 shrink-0" />
                            </Link>
                          );
                        })}
                        {pendingReviewsList.length > 4 && (
                          <Link href="/reviews" className="flex items-center gap-1 px-2.5 py-1 text-xs text-amber-700 hover:underline">
                            +{pendingReviewsList.length - 4} more <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Leave Requests */}
                  {pendingLeavesList.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <CalendarClock className="h-4 w-4 text-cyan-600" />
                        <span className="text-xs font-semibold text-cyan-800 uppercase tracking-wider">Leave Requests</span>
                        <Badge variant="outline" className="text-[10px] bg-cyan-100 text-cyan-700 border-cyan-300 ml-auto">{pendingLeavesList.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {pendingLeavesList.slice(0, 4).map(leave => {
                          const requester = getUser(leave.userId);
                          return (
                            <Link
                              key={leave.id}
                              href="/team/availability"
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/70 border border-cyan-100 hover:border-cyan-300 hover:bg-white transition-colors group"
                            >
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                                style={{ backgroundColor: requester?.avatarColor ?? "#94a3b8" }}
                              >
                                {requester?.name[0] ?? "?"}
                              </div>
                              <span className="text-xs text-gray-700 truncate flex-1">
                                {requester?.name ?? "Unknown"} &mdash; {leave.type.replace(/_/g, " ")} ({leave.days}d)
                              </span>
                              <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-cyan-600 shrink-0" />
                            </Link>
                          );
                        })}
                        {pendingLeavesList.length > 4 && (
                          <Link href="/team/availability" className="flex items-center gap-1 px-2.5 py-1 text-xs text-cyan-700 hover:underline">
                            +{pendingLeavesList.length - 4} more <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Captured Items */}
                  {pendingCaptureList.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-purple-600" />
                        <span className="text-xs font-semibold text-purple-800 uppercase tracking-wider">Captured Items</span>
                        <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-300 ml-auto">{pendingCaptureList.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {pendingCaptureList.slice(0, 4).map(item => (
                          <Link
                            key={item.id}
                            href="/capture"
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/70 border border-purple-100 hover:border-purple-300 hover:bg-white transition-colors group"
                          >
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-purple-200 bg-purple-50 text-purple-600 shrink-0">
                              {item.type.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-gray-700 truncate flex-1">{item.title}</span>
                            <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-purple-600 shrink-0" />
                          </Link>
                        ))}
                        {pendingCaptureList.length > 4 && (
                          <Link href="/capture" className="flex items-center gap-1 px-2.5 py-1 text-xs text-purple-700 hover:underline">
                            +{pendingCaptureList.length - 4} more <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Overdue & Blocked */}
                  {(overdueProjects.length > 0 || blockedTasks.length > 0) && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <ShieldAlert className="h-4 w-4 text-red-600" />
                        <span className="text-xs font-semibold text-red-800 uppercase tracking-wider">Overdue &amp; Blocked</span>
                        <Badge variant="outline" className="text-[10px] bg-red-100 text-red-700 border-red-300 ml-auto">{overdueProjects.length + blockedTasks.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {overdueProjects.slice(0, 3).map(project => (
                          <Link
                            key={project.id}
                            href={`/projects/${project.id}`}
                            className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/70 border border-red-100 hover:border-red-300 hover:bg-white transition-colors group"
                          >
                            <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-red-200 bg-red-50 text-red-600 shrink-0">
                              overdue
                            </Badge>
                            <span className="text-xs text-gray-700 truncate flex-1">{project.title}</span>
                            <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-red-600 shrink-0" />
                          </Link>
                        ))}
                        {blockedTasks.slice(0, 3).map(task => {
                          const project = PROJECTS.find(p => p.tasks.some(t => t.id === task.id));
                          return (
                            <Link
                              key={task.id}
                              href={project ? `/projects/${project.id}` : "/projects"}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/70 border border-red-100 hover:border-red-300 hover:bg-white transition-colors group"
                            >
                              <Badge variant="outline" className="text-[9px] px-1.5 py-0 border-amber-200 bg-amber-50 text-amber-600 shrink-0">
                                blocked
                              </Badge>
                              <span className="text-xs text-gray-700 truncate flex-1">{task.title}</span>
                              <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-red-600 shrink-0" />
                            </Link>
                          );
                        })}
                        {(overdueProjects.length + blockedTasks.length) > 6 && (
                          <Link href="/projects" className="flex items-center gap-1 px-2.5 py-1 text-xs text-red-700 hover:underline">
                            +{(overdueProjects.length + blockedTasks.length) - 6} more <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Upcoming Deadlines */}
                  {upcomingDeadlines.length > 0 && (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-orange-600" />
                        <span className="text-xs font-semibold text-orange-800 uppercase tracking-wider">Due This Week</span>
                        <Badge variant="outline" className="text-[10px] bg-orange-100 text-orange-700 border-orange-300 ml-auto">{upcomingDeadlines.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {upcomingDeadlines.slice(0, 4).map(project => {
                          const daysLeft = getDaysRemaining(project.startDate, project.timeboxDays);
                          return (
                            <Link
                              key={project.id}
                              href={`/projects/${project.id}`}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md bg-white/70 border border-orange-100 hover:border-orange-300 hover:bg-white transition-colors group"
                            >
                              <Badge variant="outline" className={`text-[9px] px-1.5 py-0 shrink-0 ${daysLeft <= 1 ? "border-red-200 bg-red-50 text-red-600" : "border-orange-200 bg-orange-50 text-orange-600"}`}>
                                {daysLeft === 0 ? "today" : daysLeft === 1 ? "1 day" : `${daysLeft}d`}
                              </Badge>
                              <span className="text-xs text-gray-700 truncate flex-1">{project.title}</span>
                              <ArrowRight className="h-3 w-3 text-gray-400 group-hover:text-orange-600 shrink-0" />
                            </Link>
                          );
                        })}
                        {upcomingDeadlines.length > 4 && (
                          <Link href="/projects" className="flex items-center gap-1 px-2.5 py-1 text-xs text-orange-700 hover:underline">
                            +{upcomingDeadlines.length - 4} more <ArrowRight className="h-3 w-3" />
                          </Link>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Filter Bar */}
      <Card className="border-gray-200">
        <CardContent className="pt-5 pb-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Filters</span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-6 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 ml-auto gap-1">
                <X className="h-3 w-3" /> Clear Filters
              </Button>
            )}
          </div>

          {/* Person filter */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Team Member</p>
            {USERS.filter((u) => u.id !== "u1").length <= PERSON_FILTER_PILL_THRESHOLD ? (
              <div className="flex flex-wrap gap-1.5">
                {USERS.filter((u) => u.id !== "u1").map((user) => (
                  <PersonPill
                    key={user.id}
                    user={user}
                    active={selectedPerson === user.id}
                    onClick={() => selectPerson(selectedPerson === user.id ? null : user.id)}
                  />
                ))}
              </div>
            ) : (
              <PersonSearchDropdown
                users={USERS.filter((u) => u.id !== "u1")}
                selectedPerson={selectedPerson}
                onSelect={selectPerson}
              />
            )}
          </div>

          <Separator />

          {/* Status + Priority + Deadline in a row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Status</p>
              <div className="flex flex-wrap gap-1.5">
                {STATUS_OPTIONS.map((opt) => (
                  <FilterPill key={opt} label={opt} active={statusFilter === opt} onClick={() => setStatusFilter(opt)} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Priority</p>
              <div className="flex flex-wrap gap-1.5">
                {PRIORITY_OPTIONS.map((opt) => (
                  <FilterPill key={opt} label={opt} active={priorityFilter === opt} onClick={() => setPriorityFilter(opt)} />
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <p className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">Deadline</p>
              <div className="flex flex-wrap gap-1.5">
                {DEADLINE_OPTIONS.map((opt) => (
                  <FilterPill key={opt} label={opt} active={deadlineFilter === opt} onClick={() => setDeadlineFilter(opt)} />
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Person Focused View */}
      {selectedUser && (
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6 space-y-5">
            {/* Person header */}
            <div className="flex items-center gap-4">
              <div
                className="h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold text-white shadow-md"
                style={{ backgroundColor: selectedUser.avatarColor }}
              >
                {selectedUser.name[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold">{selectedUser.name}</h2>
                <p className="text-sm text-muted-foreground">{selectedUser.role} · <span className="text-xs px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 border border-gray-200">{selectedUser.department}</span></p>
              </div>
            </div>

            {/* Person stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <ListChecks className="h-3.5 w-3.5 text-blue-600" />
                  <span className="text-[11px] text-muted-foreground">Assigned Tasks</span>
                </div>
                <p className="text-2xl font-bold">{personAssignedTasks}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  <span className="text-[11px] text-muted-foreground">Completed</span>
                </div>
                <p className="text-2xl font-bold">{personCompletedTasks}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-3.5 w-3.5 text-amber-600" />
                  <span className="text-[11px] text-muted-foreground">Pending Milestones</span>
                </div>
                <p className="text-2xl font-bold">{personPendingMilestones}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-3.5 w-3.5 text-purple-600" />
                  <span className="text-[11px] text-muted-foreground">Est. Hours</span>
                </div>
                <p className="text-2xl font-bold">{personEstimatedHours}</p>
              </div>
            </div>

            {/* Person's projects with progress */}
            {filteredProjects.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Projects</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredProjects.map((project) => {
                    const milestoneProgress = getMilestoneProgress(
                      selectedPerson
                        ? project.tasks.filter((t) => t.assigneeId === selectedPerson)
                        : project.tasks
                    );
                    return (
                      <Link key={project.id} href={`/projects/${project.id}`}>
                        <div className="bg-white rounded-lg p-3 border border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-sm font-medium truncate">{project.title}</span>
                            <Badge variant="outline" className={`text-[10px] ${statusColors[project.status]}`}>{project.status}</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[11px] text-muted-foreground">
                              <span>Task progress</span>
                              <span>{milestoneProgress}%</span>
                            </div>
                            <Progress value={milestoneProgress} className="h-1.5" />
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Person's upcoming milestones */}
            {filteredMilestones.filter((m) => m.milestone.status !== "completed").length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Upcoming Milestones</h3>
                <div className="space-y-1.5">
                  {filteredMilestones
                    .filter((m) => m.milestone.status !== "completed")
                    .slice(0, 5)
                    .map((m) => (
                      <div key={m.milestone.id} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium truncate">{m.milestone.title}</p>
                          <p className="text-[11px] text-muted-foreground truncate">{m.project.title} / {m.task.title}</p>
                        </div>
                        <Badge
                          variant="outline"
                          className={`text-[10px] shrink-0 ml-2 ${
                            m.milestone.status === "in_progress"
                              ? "text-blue-700 border-blue-200 bg-blue-50"
                              : m.milestone.status === "blocked"
                              ? "text-red-700 border-red-200 bg-red-50"
                              : "text-gray-600 border-gray-200 bg-gray-50"
                          }`}
                        >
                          {m.milestone.status.replace("_", " ")}
                        </Badge>
                      </div>
                    ))}
                </div>
              </div>
            )}

            {/* Person's pending deliverables */}
            {filteredDeliverables.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Pending Deliverables</h3>
                <div className="space-y-1.5">
                  {filteredDeliverables.slice(0, 5).map((d) => (
                    <div key={d.deliverable.id} className="bg-white rounded-lg p-3 border border-gray-100 flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{d.deliverable.title}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{d.project.title} / {d.milestone.title}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-2">
                        <Badge variant="outline" className="text-[10px]">{d.deliverable.type}</Badge>
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            d.deliverable.status === "submitted"
                              ? "text-amber-700 border-amber-200 bg-amber-50"
                              : "text-gray-600 border-gray-200 bg-gray-50"
                          }`}
                        >
                          {d.deliverable.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Daily Work Planner */}
      {selectedUser && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            <h2 className="text-xl font-semibold">Daily Work Planner</h2>
            <span className="text-sm text-muted-foreground">- {selectedUser.name}</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Yesterday Column */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-gray-600 to-gray-700 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-semibold">Yesterday</span>
                </div>
                <p className="text-[11px] text-gray-200 mt-0.5">What they did</p>
              </div>
              <CardContent className="pt-4 space-y-2">
                {yesterdayWork.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No recorded work yesterday</p>
                ) : (
                  yesterdayWork.map((item) => {
                    const catColor = categoryColors[item.step.category] || "bg-gray-100 text-gray-700 border-gray-200";
                    return (
                      <div key={item.step.id} className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 space-y-1">
                        <div className="flex items-start gap-2">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-600 mt-0.5 shrink-0" />
                          <p className="text-xs font-medium leading-snug">{item.step.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 pl-5.5">
                          <span className="text-[10px] text-muted-foreground">{item.project.title}</span>
                        </div>
                        <div className="flex items-center gap-1.5 pl-5.5">
                          <span className="text-[10px] text-muted-foreground">{item.step.actualHours ?? item.step.estimatedHours}h</span>
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${catColor}`}>{item.step.category}</Badge>
                        </div>
                        {item.step.notes && (
                          <div className="flex items-start gap-1.5 pl-5.5 mt-1">
                            <span className="text-[10px] text-muted-foreground italic">&ldquo;{item.step.notes}&rdquo;</span>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>

            {/* Today Column */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <Activity className="h-4 w-4" />
                  <span className="text-sm font-semibold">Today</span>
                </div>
                <p className="text-[11px] text-blue-100 mt-0.5">What they&apos;re doing</p>
              </div>
              <CardContent className="pt-4 space-y-2">
                {todayWork.length === 0 && personReviewTasks.filter(rt => rt.status === "pending" || rt.status === "in_progress").length === 0 && editingColumn !== "today" ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No tasks in progress</p>
                ) : (
                  <>
                    {todayWork.map((item) => {
                      const catColor = categoryColors[item.step.category] || "bg-gray-100 text-gray-700 border-gray-200";
                      return (
                        <div key={item.step.id} className="p-2.5 rounded-lg border border-blue-100 bg-blue-50/50 space-y-1">
                          <div className="flex items-start gap-2">
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-blue-500 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium leading-snug">{item.step.description}</p>
                          </div>
                          <div className="flex items-center gap-1.5 pl-5.5">
                            <span className="text-[10px] text-muted-foreground">{item.project.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-5.5">
                            <span className="text-[10px] text-muted-foreground">{item.step.estimatedHours}h est.</span>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${catColor}`}>{item.step.category}</Badge>
                          </div>
                          {item.step.notes && (
                            <div className="flex items-start gap-1.5 pl-5.5 mt-1">
                              <span className="text-[10px] text-muted-foreground italic">&ldquo;{item.step.notes}&rdquo;</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </>
                )}

                {/* CEO-Assigned Review Tasks */}
                {personReviewTasks.filter(rt => rt.status === "pending" || rt.status === "in_progress").length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider flex items-center gap-1">
                      <ClipboardList className="h-3 w-3" /> Assigned Review Tasks
                    </p>
                    {personReviewTasks.filter(rt => rt.status === "pending" || rt.status === "in_progress").map(rt => (
                      <div key={rt.id} className="p-2.5 rounded-lg border border-violet-200 bg-violet-50/50 space-y-1">
                        <div className="flex items-start gap-2">
                          <div className={`h-3.5 w-3.5 rounded-full mt-0.5 shrink-0 ${rt.status === "in_progress" ? "border-2 border-violet-500" : "bg-violet-300"}`} />
                          <p className="text-xs font-medium leading-snug">{rt.description}</p>
                        </div>
                        <div className="flex items-center gap-1.5 pl-5.5 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">{rt.projectTitle}</span>
                          <span className="text-[9px] text-violet-500">· re: {rt.sourceTitle}</span>
                        </div>
                        <div className="flex items-center gap-1.5 pl-5.5">
                          <Badge variant="outline" className="text-[9px] px-1.5 py-0 text-violet-700 border-violet-200 bg-violet-50">review</Badge>
                          {rt.dueDate && <span className="text-[9px] text-muted-foreground">Due: {rt.dueDate}</span>}
                          <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${
                            rt.priority === "high" ? "text-red-600 border-red-200 bg-red-50" :
                            rt.priority === "medium" ? "text-amber-600 border-amber-200 bg-amber-50" :
                            "text-slate-600 border-slate-200 bg-slate-50"
                          }`}>{rt.priority}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Edit section for Today */}
                {editingColumn === "today" ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <textarea
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px] resize-none"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Add note..."
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          const original = todayWork.map((s) => `- ${s.step.description}`).join("\n");
                          setEditHistory((prev) => [
                            ...prev,
                            { column: "today", originalText: original, editedText: editText + (editNote ? `\nNote: ${editNote}` : ""), editedAt: new Date().toISOString(), editedBy: selectedUser?.name ?? "" },
                          ]);
                          setEditingColumn(null);
                          setEditText("");
                          setEditNote("");
                        }}
                      >
                        <Save className="h-3 w-3" /> Save
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingColumn(null); setEditText(""); setEditNote(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 w-full"
                      onClick={() => {
                        setEditingColumn("today");
                        setEditText(todayWork.map((s) => `- ${s.step.description}`).join("\n"));
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Edit today&apos;s plan
                    </Button>
                    {/* Change tracking */}
                    {editHistory.filter((e) => e.column === "today").length > 0 && (() => {
                      const lastEdit = editHistory.filter((e) => e.column === "today").slice(-1)[0];
                      let editTime: string;
                      try {
                        editTime = format(new Date(lastEdit.editedAt), "h:mm a");
                      } catch {
                        editTime = lastEdit.editedAt;
                      }
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Pencil className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] text-muted-foreground">Edited at {editTime}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => setShowDiffColumn(showDiffColumn === "today" ? null : "today")}
                          >
                            <ArrowLeftRight className="h-3 w-3" /> {showDiffColumn === "today" ? "Hide changes" : "View changes"}
                          </Button>
                          {showDiffColumn === "today" && (
                            <div className="text-[10px] space-y-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-red-600 line-through whitespace-pre-wrap">{lastEdit.originalText}</p>
                              <p className="text-green-600 whitespace-pre-wrap">{lastEdit.editedText}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tomorrow Column */}
            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-4 py-3">
                <div className="flex items-center gap-2 text-white">
                  <CalendarClock className="h-4 w-4" />
                  <span className="text-sm font-semibold">Tomorrow</span>
                </div>
                <p className="text-[11px] text-purple-200 mt-0.5">What&apos;s planned</p>
              </div>
              <CardContent className="pt-4 space-y-2">
                {tomorrowWork.length === 0 && editingColumn !== "tomorrow" ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No upcoming tasks planned</p>
                ) : (
                  <>
                    {tomorrowWork.map((item) => {
                      const catColor = categoryColors[item.step.category] || "bg-gray-100 text-gray-700 border-gray-200";
                      return (
                        <div key={item.step.id} className="p-2.5 rounded-lg border border-gray-100 bg-gray-50/50 space-y-1">
                          <div className="flex items-start gap-2">
                            <div className="h-3.5 w-3.5 rounded-full border-2 border-gray-300 mt-0.5 shrink-0" />
                            <p className="text-xs font-medium leading-snug">{item.step.description}</p>
                          </div>
                          <div className="flex items-center gap-1.5 pl-5.5">
                            <span className="text-[10px] text-muted-foreground">{item.project.title}</span>
                          </div>
                          <div className="flex items-center gap-1.5 pl-5.5">
                            <span className="text-[10px] text-muted-foreground">{item.step.estimatedHours}h est.</span>
                            <Badge variant="outline" className={`text-[9px] px-1.5 py-0 ${catColor}`}>{item.step.category}</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </>
                )}

                {/* Edit section for Tomorrow */}
                {editingColumn === "tomorrow" ? (
                  <div className="mt-3 space-y-2 border-t pt-3">
                    <textarea
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-purple-500 min-h-[80px] resize-none"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <input
                      type="text"
                      placeholder="Add note..."
                      className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      value={editNote}
                      onChange={(e) => setEditNote(e.target.value)}
                    />
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 text-xs gap-1"
                        onClick={() => {
                          const original = tomorrowWork.map((s) => `- ${s.step.description}`).join("\n");
                          setEditHistory((prev) => [
                            ...prev,
                            { column: "tomorrow", originalText: original, editedText: editText + (editNote ? `\nNote: ${editNote}` : ""), editedAt: new Date().toISOString(), editedBy: selectedUser?.name ?? "" },
                          ]);
                          setEditingColumn(null);
                          setEditText("");
                          setEditNote("");
                        }}
                      >
                        <Save className="h-3 w-3" /> Save
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => { setEditingColumn(null); setEditText(""); setEditNote(""); }}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-3 border-t pt-3 space-y-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs gap-1 w-full"
                      onClick={() => {
                        setEditingColumn("tomorrow");
                        setEditText(tomorrowWork.map((s) => `- ${s.step.description}`).join("\n"));
                      }}
                    >
                      <Pencil className="h-3 w-3" /> Edit tomorrow&apos;s plan
                    </Button>
                    {/* Change tracking */}
                    {editHistory.filter((e) => e.column === "tomorrow").length > 0 && (() => {
                      const lastEdit = editHistory.filter((e) => e.column === "tomorrow").slice(-1)[0];
                      let editTime: string;
                      try {
                        editTime = format(new Date(lastEdit.editedAt), "h:mm a");
                      } catch {
                        editTime = lastEdit.editedAt;
                      }
                      return (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Pencil className="h-3 w-3 text-gray-400" />
                            <span className="text-[10px] text-muted-foreground">Edited at {editTime}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 text-[10px] gap-1 px-2"
                            onClick={() => setShowDiffColumn(showDiffColumn === "tomorrow" ? null : "tomorrow")}
                          >
                            <ArrowLeftRight className="h-3 w-3" /> {showDiffColumn === "tomorrow" ? "Hide changes" : "View changes"}
                          </Button>
                          {showDiffColumn === "tomorrow" && (
                            <div className="text-[10px] space-y-1 p-2 bg-gray-50 rounded-lg border border-gray-100">
                              <p className="text-red-600 line-through whitespace-pre-wrap">{lastEdit.originalText}</p>
                              <p className="text-green-600 whitespace-pre-wrap">{lastEdit.editedText}</p>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ═══════ CONTRIBUTIONS & DELIVERABLES ═══════ */}
      {selectedPerson && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Trophy className="h-5 w-5 text-amber-500" />
              Contributions & Deliverables
              <span className="text-sm font-normal text-muted-foreground">— {selectedUser?.name}</span>
            </h2>
            {/* Time period filter */}
            <div className="flex items-center gap-1 rounded-lg border border-border bg-white p-0.5 shadow-sm">
              {TIME_PERIOD_OPTIONS.map(period => (
                <button
                  key={period}
                  onClick={() => setContributionPeriod(period)}
                  className={`px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                    contributionPeriod === period
                      ? "bg-amber-500 text-white shadow-sm"
                      : "text-muted-foreground hover:bg-gray-100"
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          </div>

          {/* Summary Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-white p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{contributionSummary.total}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Total Items</p>
            </div>
            <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-white p-3 text-center">
              <p className="text-2xl font-bold text-emerald-700">{contributionSummary.completedTasks}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Tasks Done</p>
            </div>
            <div className="rounded-lg border bg-gradient-to-br from-blue-50 to-white p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{contributionSummary.deliverables}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Deliverables</p>
            </div>
            <div className="rounded-lg border bg-gradient-to-br from-purple-50 to-white p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{contributionSummary.submissions}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Submissions</p>
            </div>
            <div className="rounded-lg border bg-gradient-to-br from-indigo-50 to-white p-3 text-center">
              <p className="text-2xl font-bold text-indigo-700">{contributionSummary.completedSteps}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Steps Done</p>
            </div>
            <div className="rounded-lg border bg-gradient-to-br from-green-50 to-white p-3 text-center">
              <p className="text-2xl font-bold text-green-700">{contributionSummary.approved}</p>
              <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Approved</p>
            </div>
          </div>

          {/* Deliverable Type Breakdown */}
          {contributionSummary.byType.length > 0 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] text-muted-foreground font-medium">By Type:</span>
              {contributionSummary.byType.map(([type, count]) => (
                <Badge key={type} variant="outline" className={`text-[10px] gap-1 ${deliverableTypeConfig[type as DeliverableType]?.color || ""}`}>
                  {deliverableTypeConfig[type as DeliverableType]?.icon}
                  {deliverableTypeConfig[type as DeliverableType]?.label || type}
                  <span className="font-bold ml-0.5">{count}</span>
                </Badge>
              ))}
            </div>
          )}

          {/* Contributions Timeline */}
          <Card>
            <CardContent className="pt-4 pb-4">
              {filteredContributions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No contributions found for {contributionPeriod === "All Time" ? "this person" : contributionPeriod.toLowerCase()}.
                </p>
              ) : (
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-3 top-3 bottom-3 w-px bg-gradient-to-b from-amber-300 via-blue-300 to-emerald-300" />

                  <div className="space-y-3">
                    {filteredContributions.map((item) => {
                      const isExpanded = expandedContribution === item.id;
                      let formattedDate: string;
                      try {
                        formattedDate = format(new Date(item.date), "MMM d, yyyy");
                      } catch {
                        formattedDate = item.date;
                      }

                      const typeConfig = {
                        deliverable: { color: "bg-blue-500", label: "Deliverable", badgeColor: "text-blue-700 bg-blue-50 border-blue-200", icon: <FileCheck className="h-3 w-3" /> },
                        intermediate_submission: { color: "bg-purple-500", label: "Submission", badgeColor: "text-purple-700 bg-purple-50 border-purple-200", icon: <Package className="h-3 w-3" /> },
                        completed_step: { color: "bg-emerald-500", label: "Step Completed", badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200", icon: <CheckCircle2 className="h-3 w-3" /> },
                        completed_task: { color: "bg-amber-500", label: "Task Completed", badgeColor: "text-amber-700 bg-amber-50 border-amber-200", icon: <Trophy className="h-3 w-3" /> },
                      }[item.type];

                      const statusBadge = {
                        submitted: "text-blue-600 bg-blue-50 border-blue-200",
                        approved: "text-emerald-600 bg-emerald-50 border-emerald-200",
                        verified: "text-emerald-700 bg-emerald-100 border-emerald-300",
                        reviewed: "text-purple-600 bg-purple-50 border-purple-200",
                        needs_revision: "text-amber-600 bg-amber-50 border-amber-200",
                        pending: "text-slate-600 bg-slate-50 border-slate-200",
                        rejected: "text-red-600 bg-red-50 border-red-200",
                        completed: "text-emerald-600 bg-emerald-50 border-emerald-200",
                        not_needed: "text-gray-500 bg-gray-50 border-gray-200",
                        pending_review: "text-amber-600 bg-amber-50 border-amber-200",
                        changes_requested: "text-red-600 bg-red-50 border-red-200",
                      }[item.status] || "text-gray-600 bg-gray-50 border-gray-200";

                      return (
                        <div key={item.id} className="relative pl-8">
                          {/* Timeline dot */}
                          <div className={`absolute left-1.5 top-3 h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm ${typeConfig.color}`} />

                          <div
                            className={`rounded-lg border p-3 transition-all cursor-pointer hover:shadow-sm ${
                              item.isKeyMilestone ? "border-amber-200 bg-amber-50/20" :
                              item.type === "completed_task" ? "border-amber-200 bg-amber-50/10" : "border-border bg-white"
                            }`}
                            onClick={() => setExpandedContribution(isExpanded ? null : item.id)}
                          >
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                {item.isKeyMilestone && <Star className="h-3 w-3 text-amber-500 shrink-0 fill-amber-400" />}
                                <span className="text-xs font-semibold truncate">{item.title}</span>
                                <Badge variant="outline" className={`text-[9px] shrink-0 ${typeConfig.badgeColor}`}>
                                  {typeConfig.icon}
                                  <span className="ml-0.5">{typeConfig.label}</span>
                                </Badge>
                                {item.deliverableType && (
                                  <Badge variant="outline" className={`text-[9px] shrink-0 ${deliverableTypeConfig[item.deliverableType]?.color || ""}`}>
                                    {deliverableTypeConfig[item.deliverableType]?.icon}
                                    <span className="ml-0.5">{deliverableTypeConfig[item.deliverableType]?.label}</span>
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <Badge variant="outline" className={`text-[9px] ${statusBadge}`}>
                                  {item.status.replace(/_/g, " ")}
                                </Badge>
                                {isExpanded ? <ChevronUp className="h-3 w-3 text-muted-foreground" /> : <ChevronDown className="h-3 w-3 text-muted-foreground" />}
                              </div>
                            </div>

                            {/* Meta row */}
                            <div className="flex items-center gap-3 mt-1.5 text-[10px] text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-2.5 w-2.5" /> {formattedDate}
                              </span>
                              <Link href={`/projects/${item.projectId}`} className="text-blue-600 hover:underline flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
                                <FolderKanban className="h-2.5 w-2.5" /> {item.projectTitle}
                              </Link>
                              {item.taskTitle && (
                                <span className="text-muted-foreground">· {item.taskTitle}</span>
                              )}
                              {item.verifiedBy && (
                                <span className="flex items-center gap-0.5 text-emerald-600">
                                  <ShieldCheck className="h-2.5 w-2.5" /> Verified by {getUser(item.verifiedBy)?.name}
                                </span>
                              )}
                              {item.reviewedBy && (
                                <span className="flex items-center gap-0.5 text-purple-600">
                                  <Eye className="h-2.5 w-2.5" /> Reviewed by {getUser(item.reviewedBy)?.name}
                                </span>
                              )}
                            </div>

                            {/* Expanded details */}
                            {isExpanded && (
                              <div className="mt-3 pt-2.5 border-t border-gray-100 space-y-2">
                                <p className="text-[11px] text-gray-600 leading-relaxed">{item.description}</p>
                                {item.url && (
                                  <a href={item.url} target="_blank" rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 underline"
                                    onClick={(e) => e.stopPropagation()}>
                                    <ExternalLink className="h-2.5 w-2.5" /> View Attachment / Link
                                  </a>
                                )}
                                {item.feedback && (
                                  <div className="rounded border border-blue-200 bg-blue-50/50 p-2 text-[10px]">
                                    <span className="font-semibold text-blue-700">Feedback: </span>
                                    <span className="text-blue-800">{item.feedback}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderKanban className="h-5 w-5 text-blue-600" />}
          label={selectedPerson ? "Their Active Projects" : "Active Projects"}
          value={activeProjectsCount}
        />
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5 text-amber-600" />}
          label="Pending Reviews"
          value={filteredPendingReviews.length}
          alert={filteredPendingReviews.length > 0}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Completed Tasks"
          value={completedTasksCount}
        />
        <StatCard
          icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
          label="Blocked Tasks"
          value={blockedTasksCount}
          alert={blockedTasksCount > 0}
        />
      </div>

      {/* Recent Captures */}
      {CAPTURE_SESSIONS.length > 0 && (() => {
        const pendingItems = getPendingCaptureItems();
        const recentItems = pendingItems.slice(0, 3);
        if (recentItems.length === 0) return null;
        const typeIcons: Record<string, string> = {
          todo: "📋", follow_up: "⏰", commitment: "🤝", meeting: "📅", review_reminder: "👁", timeline: "🎯",
        };
        return (
          <Card className="border-purple-200 bg-purple-50/20">
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-semibold text-purple-800">Recent Captures</span>
                  <Badge variant="outline" className="text-[10px] bg-purple-100 text-purple-700 border-purple-300">{pendingItems.length} pending</Badge>
                </div>
                <Link href="/capture" className="text-xs text-purple-600 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="space-y-2">
                {recentItems.map(item => (
                  <div key={item.id} className="flex items-center gap-2 text-sm">
                    <span>{typeIcons[item.type] || "📌"}</span>
                    <span className="truncate flex-1">{item.title}</span>
                    {item.dueDate && <span className="text-[10px] text-muted-foreground shrink-0">{new Date(item.dueDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* AI Insights Panel */}
      <Card className="border-blue-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-blue-600" />
            AI Insights & Recommended Actions
          </CardTitle>
          <CardDescription>Based on project progress, team activity, and submission patterns</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {AI_INSIGHTS.filter((i) => i.severity !== "low")
            .filter((i) => !selectedPerson || !i.relatedUserId || i.relatedUserId === selectedPerson)
            .map((insight) => (
              <div key={insight.id} className={`p-4 rounded-lg border ${insightBorders[insight.type]}`}>
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">{insightIcons[insight.type]}</div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{insight.title}</span>
                      <Badge variant="outline" className="text-[10px]">{insight.severity}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{insight.description}</p>
                    {insight.actionItems && (
                      <div className="space-y-1">
                        {insight.actionItems.map((item, i) => (
                          <div key={i} className="flex items-center gap-2 text-sm">
                            <ArrowRight className="h-3 w-3 text-blue-600 shrink-0" />
                            <span>{item}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {insight.relatedProjectId && (
                    <Link href={`/projects/${insight.relatedProjectId}`}>
                      <Button variant="ghost" size="sm" className="text-xs shrink-0">View Project</Button>
                    </Link>
                  )}
                </div>
              </div>
            ))}
        </CardContent>
      </Card>

      {/* Active Projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">
            {hasActiveFilters ? `Projects (${filteredProjects.length})` : "Active Projects"}
          </h2>
          <Link href="/projects/new"><Button size="sm" className="gap-1"><Sparkles className="h-3 w-3" /> New Project</Button></Link>
        </div>

        {filteredProjects.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No projects match the current filters.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filteredProjects.map((project) => {
              const tasksForProgress = selectedPerson
                ? project.tasks.filter((t) => t.assigneeId === selectedPerson)
                : project.tasks;
              const milestoneProgress = getMilestoneProgress(tasksForProgress);
              const daysLeft = getDaysRemaining(project.startDate, project.timeboxDays);
              const isOverdue = daysLeft < 0;
              const pendingCount = project.updates.filter((u) => !u.reviewed).length;
              const currentTask = project.tasks.find((t) => t.status === "in_progress");

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:bg-gray-100 transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-base truncate">{project.title}</CardTitle>
                            {pendingCount > 0 && (
                              <span className="flex items-center justify-center h-5 min-w-[20px] rounded-full bg-amber-500 text-[10px] font-bold text-white px-1.5">{pendingCount}</span>
                            )}
                          </div>
                          <CardDescription className="mt-1 line-clamp-2">{project.requirement}</CardDescription>
                        </div>
                        <div className={`h-2.5 w-2.5 rounded-full ml-2 shrink-0 ${priorityColors[project.priority]}`} title={`${project.priority} priority`} />
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={typeColors[project.type] || "text-gray-700 border-gray-200 bg-gray-50"}>
                          {typeLabels[project.type] || project.type}
                        </Badge>
                        <Badge variant="outline" className={statusColors[project.status]}>{project.status}</Badge>
                        {isOverdue && <Badge variant="outline" className="text-red-700 border-red-200 bg-red-50">Overdue</Badge>}
                      </div>

                      {/* Task progress */}
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>Tasks: {tasksForProgress.filter((t) => t.status === "completed").length}/{tasksForProgress.length}</span>
                          <span>{milestoneProgress}%</span>
                        </div>
                        <Progress value={milestoneProgress} className="h-1.5" />
                      </div>

                      {currentTask && (
                        <div className="text-xs p-2 rounded bg-gray-100">
                          <span className="text-muted-foreground">Current: </span>
                          <span className="font-medium">{currentTask.title}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {isOverdue ? (
                            <span className="text-red-600">{Math.abs(daysLeft)}d overdue</span>
                          ) : (
                            <span>{daysLeft}d remaining</span>
                          )}
                        </div>
                        <div className="flex -space-x-1.5">
                          {project.assigneeIds.map((uid) => {
                            const user = getUser(uid);
                            return user ? (
                              <div
                                key={uid}
                                className={`h-5 w-5 rounded-full border-2 flex items-center justify-center text-[9px] font-bold text-white ${
                                  selectedPerson === uid ? "border-blue-500 ring-1 ring-blue-400" : "border-background"
                                }`}
                                style={{ backgroundColor: user.avatarColor }}
                                title={user.name}
                              >
                                {user.name[0]}
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Actions Timeline */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-blue-600" />
            Recent Activity
          </h2>
        </div>
        {recentActivity.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              No recent activity for the current filters.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[17px] top-2 bottom-2 w-px bg-gray-200" />

                <div className="space-y-4">
                  {recentActivity.map((item, idx) => {
                    const user = getUser(item.userId);
                    if (!user) return null;

                    const typeLabel: Record<string, string> = {
                      status_update: "Status Update",
                      document: "Document",
                      code: "Code",
                      architecture: "Architecture",
                      notebook: "Notebook",
                      demo: "Demo",
                      meeting_notes: "Meeting Notes",
                      task_update: "Task Update",
                      milestone_update: "Milestone Update",
                    };

                    const typeBadgeColor: Record<string, string> = {
                      status_update: "text-blue-700 border-blue-200 bg-blue-50",
                      document: "text-purple-700 border-purple-200 bg-purple-50",
                      code: "text-green-700 border-green-200 bg-green-50",
                      architecture: "text-teal-700 border-teal-200 bg-teal-50",
                      notebook: "text-amber-700 border-amber-200 bg-amber-50",
                      demo: "text-pink-700 border-pink-200 bg-pink-50",
                      meeting_notes: "text-indigo-700 border-indigo-200 bg-indigo-50",
                      task_update: "text-orange-700 border-orange-200 bg-orange-50",
                      milestone_update: "text-cyan-700 border-cyan-200 bg-cyan-50",
                    };

                    let formattedDate: string;
                    try {
                      formattedDate = format(new Date(item.date), "MMM d, h:mm a");
                    } catch {
                      formattedDate = item.date;
                    }

                    return (
                      <div key={item.id + idx} className="relative flex items-start gap-3 pl-0">
                        {/* Avatar on timeline */}
                        <div
                          className="relative z-10 h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 shadow-sm"
                          style={{ backgroundColor: user.avatarColor }}
                        >
                          {user.name[0]}
                        </div>

                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium">{user.name}</span>
                            <Badge variant="outline" className={`text-[10px] ${typeBadgeColor[item.type] || "text-gray-600 border-gray-200 bg-gray-50"}`}>
                              {typeLabel[item.type] || item.type}
                            </Badge>
                            <span className="text-[11px] text-muted-foreground ml-auto shrink-0">{formattedDate}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-1">{item.message}</p>
                          <Link href={`/projects/${item.projectId}`} className="text-[11px] text-blue-600 hover:underline">
                            {item.projectTitle}
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Team Performance Quick View */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Team Overview</h2>
          <Link href="/team"><Button variant="ghost" size="sm" className="gap-1"><BarChart3 className="h-3 w-3" /> View Details</Button></Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {USERS.filter((u) => u.id !== "u1").map((user) => {
            const userProjects = PROJECTS.filter((p) => p.assigneeIds.includes(user.id) && p.status === "active");
            const userUpdates = PROJECTS.flatMap((p) => p.updates.filter((u2) => u2.userId === user.id));
            const userTasks = getAllTasks().filter((t) => t.assigneeId === user.id);
            const completedCount = userTasks.filter((t) => t.status === "completed").length;
            const blockedCount = userTasks.filter((t) => t.status === "blocked").length;
            const isSelected = selectedPerson === user.id;

            return (
              <Card
                key={user.id}
                className={`transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-blue-500 border-blue-300 bg-blue-50/30"
                    : "hover:bg-gray-100"
                }`}
                onClick={() => selectPerson(isSelected ? null : user.id)}
              >
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${isSelected ? "ring-2 ring-blue-400 ring-offset-2" : ""}`}
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.name[0]}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.role}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">{userProjects.length}</p>
                      <p className="text-[10px] text-muted-foreground">active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
                    <span>{userUpdates.length} submissions</span>
                    <span>{completedCount} completed</span>
                    {blockedCount > 0 && (
                      <span className="text-red-600">{blockedCount} blocked</span>
                    )}
                    <span className="ml-auto">{userUpdates.filter((u2) => u2.reviewed).length} reviewed</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
