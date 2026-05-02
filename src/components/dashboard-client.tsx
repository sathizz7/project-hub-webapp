"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  FolderKanban,
  ClipboardCheck,
  CheckCircle2,
  Users,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { formatDistanceToNow, differenceInDays, addDays } from "date-fns";

type DashboardProps = {
  projects: any[];
  users: any[];
  pendingReviews: any[];
};

function getPhaseProgress(phases: any[]) {
  const completed = phases.filter((p: any) => p.status === "completed").length;
  return Math.round((completed / phases.length) * 100);
}

function getDaysRemaining(startDate: string, timeboxDays: number) {
  const end = addDays(new Date(startDate), timeboxDays);
  return differenceInDays(end, new Date());
}

const priorityColors: Record<string, string> = {
  low: "bg-slate-600",
  medium: "bg-blue-600",
  high: "bg-amber-600",
  critical: "bg-red-600",
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
};

export function DashboardClient({
  projects,
  users,
  pendingReviews,
}: DashboardProps) {
  const activeProjects = projects.filter((p) => p.status === "active");
  const completedProjects = projects.filter((p) => p.status === "completed");
  const overdueProjects = activeProjects.filter(
    (p) => getDaysRemaining(p.startDate, p.timeboxDays) < 0
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Overview of all projects and team activity
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={<FolderKanban className="h-5 w-5 text-blue-600" />}
          label="Active Projects"
          value={activeProjects.length}
        />
        <StatCard
          icon={<ClipboardCheck className="h-5 w-5 text-amber-600" />}
          label="Pending Reviews"
          value={pendingReviews.length}
          alert={pendingReviews.length > 0}
        />
        <StatCard
          icon={<CheckCircle2 className="h-5 w-5 text-green-600" />}
          label="Completed"
          value={completedProjects.length}
        />
        <StatCard
          icon={<Users className="h-5 w-5 text-purple-600" />}
          label="Team Members"
          value={users.length}
        />
      </div>

      {/* Alerts */}
      {(overdueProjects.length > 0 || pendingReviews.length > 0) && (
        <div className="space-y-2">
          {overdueProjects.map((p) => (
            <Link key={p.id} href={`/projects/${p.id}`}>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-200 hover:bg-red-100 transition-colors">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-sm text-red-600">
                  <strong>{p.title}</strong> is overdue by{" "}
                  {Math.abs(getDaysRemaining(p.startDate, p.timeboxDays))} days
                </span>
              </div>
            </Link>
          ))}
          {pendingReviews.length > 0 && (
            <Link href="/reviews">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-200 hover:bg-amber-100 transition-colors">
                <Clock className="h-4 w-4 text-amber-600" />
                <span className="text-sm text-amber-600">
                  <strong>{pendingReviews.length}</strong> submission
                  {pendingReviews.length !== 1 ? "s" : ""} awaiting review
                </span>
              </div>
            </Link>
          )}
        </div>
      )}

      {/* Project Cards */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Projects</h2>
        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No projects yet.{" "}
              <Link
                href="/projects/new"
                className="text-blue-600 hover:underline"
              >
                Create your first project
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {projects.map((project) => {
              const progress = getPhaseProgress(project.phases);
              const daysLeft = getDaysRemaining(
                project.startDate,
                project.timeboxDays
              );
              const isOverdue = daysLeft < 0 && project.status === "active";
              const pendingCount = project.submissions.filter(
                (s: any) => s.feedback.length === 0
              ).length;

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <Card className="hover:bg-gray-100 transition-colors cursor-pointer h-full">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-base truncate">
                            {project.title}
                          </CardTitle>
                          <CardDescription className="mt-1 line-clamp-2">
                            {project.requirement}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          {pendingCount > 0 && (
                            <span className="flex items-center justify-center h-5 w-5 rounded-full bg-amber-500 text-[10px] font-bold text-white">
                              {pendingCount}
                            </span>
                          )}
                          <div
                            className={`h-2.5 w-2.5 rounded-full ${priorityColors[project.priority]}`}
                            title={`${project.priority} priority`}
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center gap-2 flex-wrap">
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
                        {isOverdue && (
                          <Badge
                            variant="outline"
                            className="text-red-700 border-red-200 bg-red-50"
                          >
                            Overdue
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>
                            Phase: {project.currentPhase || "Not started"}
                          </span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>

                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {project.status === "active" ? (
                            isOverdue ? (
                              <span className="text-red-600">
                                {Math.abs(daysLeft)}d overdue
                              </span>
                            ) : (
                              <span>{daysLeft}d remaining</span>
                            )
                          ) : (
                            <span>
                              {formatDistanceToNow(
                                new Date(project.createdAt),
                                { addSuffix: true }
                              )}
                            </span>
                          )}
                        </div>
                        <div className="flex -space-x-1.5">
                          {project.assignees
                            .slice(0, 3)
                            .map((a: any) => (
                              <div
                                key={a.user.id}
                                className="h-5 w-5 rounded-full border border-background flex items-center justify-center text-[9px] font-bold text-white"
                                style={{
                                  backgroundColor: a.user.avatarColor,
                                }}
                                title={a.user.name}
                              >
                                {a.user.name[0]}
                              </div>
                            ))}
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

      {/* Team Workload */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Team Workload</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const activeCount = user.assignedProjects.filter(
              (ap: any) => ap.project.status === "active"
            ).length;
            return (
              <Link key={user.id} href={`/team/${user.id}`}>
                <Card className="hover:bg-gray-100 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold text-white"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.name[0]}
                      </div>
                      <div>
                        <p className="font-medium">{user.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {user.role}
                        </p>
                      </div>
                      <div className="ml-auto text-right">
                        <p className="text-2xl font-bold">{activeCount}</p>
                        <p className="text-xs text-muted-foreground">
                          active project{activeCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  alert,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  alert?: boolean;
}) {
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
            {alert && (
              <span className="absolute -top-1 -right-1 h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
