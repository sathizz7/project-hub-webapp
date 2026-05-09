"use client";

import { useState } from "react";
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
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Clock } from "lucide-react";
import { addDays, differenceInDays, formatDistanceToNow } from "date-fns";

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
  engineering: "Eng",
  research: "Research",
  mixed: "Mixed",
  data_science: "DS",
  design: "Design",
  sales: "Sales",
  marketing: "Mktg",
  operations: "Ops",
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

const priorityColors: Record<string, string> = {
  low: "bg-slate-600",
  medium: "bg-blue-600",
  high: "bg-amber-600",
  critical: "bg-red-600",
};

export function ProjectsListClient({ projects }: { projects: any[] }) {
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  const filtered = projects.filter((p) => {
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-1">
            {projects.length} total project{projects.length !== 1 ? "s" : ""}
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            New Project
          </Button>
        </Link>
      </div>

      <div className="flex gap-3">
        <Select value={filterType} onValueChange={(v) => v && setFilterType(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="engineering">Engineering</SelectItem>
            <SelectItem value="research">Research/DS</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterStatus} onValueChange={(v) => v && setFilterStatus(v)}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="killed">Killed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No projects match your filters
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((project) => {
            const completedPhases = project.phases.filter(
              (p: any) => p.status === "completed"
            ).length;
            const progress = Math.round(
              (completedPhases / project.phases.length) * 100
            );
            const daysLeft = differenceInDays(
              addDays(new Date(project.startDate), project.timeboxDays),
              new Date()
            );

            return (
              <Link key={project.id} href={`/projects/${project.id}`}>
                <Card className="hover:bg-gray-100 transition-colors cursor-pointer">
                  <CardContent className="py-4">
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-2.5 w-2.5 rounded-full shrink-0 ${priorityColors[project.priority]}`}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate">
                            {project.title}
                          </span>
                          <Badge
                            variant="outline"
                            className={`${typeColors[project.type] || "text-gray-700 border-gray-200 bg-gray-50"} shrink-0`}
                          >
                            {typeLabels[project.type] || project.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className={`${statusColors[project.status]} shrink-0`}
                          >
                            {project.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1 truncate">
                          {project.requirement}
                        </p>
                      </div>
                      <div className="w-32 shrink-0">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1">
                          <span>{project.currentPhase}</span>
                          <span>{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-1.5" />
                      </div>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 w-24 justify-end">
                        <Clock className="h-3 w-3" />
                        {project.status === "active" ? (
                          daysLeft < 0 ? (
                            <span className="text-red-600">
                              {Math.abs(daysLeft)}d overdue
                            </span>
                          ) : (
                            <span>{daysLeft}d left</span>
                          )
                        ) : (
                          <span>
                            {formatDistanceToNow(new Date(project.createdAt), {
                              addSuffix: true,
                            })}
                          </span>
                        )}
                      </div>
                      <div className="flex -space-x-1.5 shrink-0">
                        {project.assignees.slice(0, 3).map((a: any) => (
                          <div
                            key={a.user.id}
                            className="h-6 w-6 rounded-full border border-background flex items-center justify-center text-[9px] font-bold text-white"
                            style={{ backgroundColor: a.user.avatarColor }}
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
  );
}
