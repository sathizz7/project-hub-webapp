"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FolderKanban,
  Plus,
  Clock,
  Sparkles,
} from "lucide-react";
import {
  PROJECTS,
  USERS,
  getUser,
  getMilestoneProgress,
  getDaysRemaining,
} from "@/lib/mock-data";

const priorityDotColors: Record<string, string> = {
  low: "bg-slate-400",
  medium: "bg-blue-400",
  high: "bg-amber-400",
  critical: "bg-red-500 animate-pulse",
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
  research: "Research",
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

export default function ProjectsPage() {
  const [typeFilter, setTypeFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPerson, setSelectedPerson] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"priority" | "deadline" | "recent" | "alpha" | "progress">("priority");

  const filtered = useMemo(() => {
    const list = PROJECTS.filter((p) => {
      if (typeFilter !== "all" && p.type !== typeFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (selectedPerson && !(
        p.ownerId === selectedPerson ||
        p.coOwnerIds?.includes(selectedPerson) ||
        p.assigneeIds.includes(selectedPerson)
      )) return false;
      return true;
    });

    const priorityOrder: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    return [...list].sort((a, b) => {
      switch (sortBy) {
        case "priority":
          return (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
        case "deadline": {
          const daysA = getDaysRemaining(a.startDate, a.timeboxDays);
          const daysB = getDaysRemaining(b.startDate, b.timeboxDays);
          return daysA - daysB;
        }
        case "recent":
          return new Date(b.startDate).getTime() - new Date(a.startDate).getTime();
        case "alpha":
          return a.title.localeCompare(b.title);
        case "progress": {
          const progA = a.tasks.length > 0 ? a.tasks.filter(t => t.status === "completed").length / a.tasks.length : 0;
          const progB = b.tasks.length > 0 ? b.tasks.filter(t => t.status === "completed").length / b.tasks.length : 0;
          return progA - progB;
        }
        default:
          return 0;
      }
    });
  }, [typeFilter, statusFilter, selectedPerson, sortBy]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FolderKanban className="h-7 w-7 text-blue-600" />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            {filtered.length} project{filtered.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={typeFilter} onValueChange={(v) => v && setTypeFilter(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(typeLabels).map(([key, label]) => (
              <SelectItem key={key} value={key}>{label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={statusFilter} onValueChange={(v) => v && setStatusFilter(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="killed">Killed</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
          </SelectContent>
        </Select>

        <Select value={selectedPerson ?? "all"} onValueChange={(v) => setSelectedPerson(v === "all" ? null : v)}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Owner / Team Member" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Members</SelectItem>
            {USERS.map((u) => (
              <SelectItem key={u.id} value={u.id}>{u.name} ({u.department})</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={sortBy} onValueChange={(v) => v && setSortBy(v as typeof sortBy)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sort by" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="priority">Priority (Highest)</SelectItem>
            <SelectItem value="deadline">Deadline (Soonest)</SelectItem>
            <SelectItem value="recent">Recently Created</SelectItem>
            <SelectItem value="alpha">Alphabetical</SelectItem>
            <SelectItem value="progress">Progress (Least)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Project List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            No projects match the current filters.
          </div>
        )}
        {filtered.map((project) => {
          const milestoneProgress = getMilestoneProgress(project.tasks);
          const daysLeft = getDaysRemaining(project.startDate, project.timeboxDays);
          const isOverdue = daysLeft < 0;
          const completedTasks = project.tasks.filter(
            (t) => t.status === "completed"
          ).length;

          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover:bg-gray-100 transition-colors cursor-pointer group">
                <CardContent className="py-4">
                  <div className="flex items-center gap-4">
                    {/* Priority dot */}
                    <div
                      className={`h-3 w-3 rounded-full shrink-0 ${priorityDotColors[project.priority]}`}
                      title={`${project.priority} priority`}
                    />

                    {/* Main content */}
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="flex items-center gap-3 flex-wrap">
                        <h3 className="font-semibold text-sm group-hover:text-blue-600 transition-colors truncate">
                          {project.title}
                        </h3>
                        <Badge
                          variant="outline"
                          className={typeColors[project.type] || "text-gray-700 border-gray-200 bg-gray-50"}
                        >
                          {typeLabels[project.type] || project.type}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={statusColors[project.status]}
                        >
                          {project.status}
                        </Badge>
                      </div>

                      {/* Owner + Co-owners + Department */}
                      <div className="flex items-center gap-3 flex-wrap">
                        {(() => {
                          const owner = getUser(project.ownerId);
                          return owner ? (
                            <div className="flex items-center gap-1.5">
                              <div
                                className="h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                                style={{ backgroundColor: owner.avatarColor }}
                              >
                                {owner.name[0]}
                              </div>
                              <span className="text-xs font-medium text-gray-700">{owner.name}</span>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 bg-gray-50 text-gray-500 border-gray-200">
                                {owner.department}
                              </Badge>
                            </div>
                          ) : null;
                        })()}
                        {project.coOwnerIds && project.coOwnerIds.length > 0 && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-muted-foreground">Co-owner:</span>
                            {project.coOwnerIds.map((cid) => {
                              const co = getUser(cid);
                              return co ? (
                                <div key={cid} className="flex items-center gap-1">
                                  <div
                                    className="h-4 w-4 rounded-full flex items-center justify-center text-[8px] font-bold text-white"
                                    style={{ backgroundColor: co.avatarColor }}
                                  >
                                    {co.name[0]}
                                  </div>
                                  <span className="text-[11px] text-gray-600">{co.name}</span>
                                </div>
                              ) : null;
                            })}
                          </div>
                        )}
                      </div>

                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {project.requirement}
                      </p>

                      {/* Milestone progress bar */}
                      <div className="flex items-center gap-3 max-w-md">
                        <Progress value={milestoneProgress} className="flex-1 h-1.5" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {completedTasks}/{project.tasks.length} tasks
                        </span>
                      </div>
                    </div>

                    {/* Days remaining */}
                    <div className="text-right shrink-0 min-w-[80px]">
                      <div className="flex items-center gap-1 justify-end">
                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                        {project.status === "completed" ? (
                          <span className="text-xs text-green-600 font-medium">
                            Done
                          </span>
                        ) : isOverdue ? (
                          <span className="text-xs text-red-600 font-medium">
                            {Math.abs(daysLeft)}d overdue
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            {daysLeft}d left
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Team avatars */}
                    <div className="flex -space-x-2 shrink-0">
                      {project.assigneeIds.map((uid) => {
                        const user = getUser(uid);
                        return user ? (
                          <div
                            key={uid}
                            className="h-7 w-7 rounded-full border-2 border-background flex items-center justify-center text-[10px] font-bold text-white"
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
    </div>
  );
}
