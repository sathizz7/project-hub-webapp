"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
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

const statusColors: Record<string, string> = {
  active: "text-emerald-400 border-emerald-400/30 bg-emerald-400/10",
  completed: "text-green-400 border-green-400/30 bg-green-400/10",
  killed: "text-red-400 border-red-400/30 bg-red-400/10",
};

export function TeamMemberClient({ user }: { user: any }) {
  const activeProjects = user.assignedProjects.filter(
    (ap: any) => ap.project.status === "active"
  );

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Profile Header */}
      <div className="flex items-center gap-4">
        <div
          className="h-16 w-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
          style={{ backgroundColor: user.avatarColor }}
        >
          {user.name[0]}
        </div>
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <p className="text-muted-foreground">{user.role}</p>
          <p className="text-sm text-muted-foreground">{user.email}</p>
        </div>
      </div>

      {/* Active Projects */}
      <Card>
        <CardHeader>
          <CardTitle>
            Active Projects ({activeProjects.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {activeProjects.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No active projects
            </p>
          ) : (
            activeProjects.map((ap: any) => {
              const project = ap.project;
              const completedPhases = project.phases.filter(
                (p: any) => p.status === "completed"
              ).length;
              const progress = Math.round(
                (completedPhases / project.phases.length) * 100
              );

              return (
                <Link key={project.id} href={`/projects/${project.id}`}>
                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Phase: {project.currentPhase}
                      </p>
                    </div>
                    <div className="w-24 shrink-0">
                      <Progress value={progress} className="h-1.5" />
                    </div>
                    <Badge
                      variant="outline"
                      className={statusColors[project.status]}
                    >
                      {project.status}
                    </Badge>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* Submissions & Feedback History */}
      <Card>
        <CardHeader>
          <CardTitle>
            Submissions & Feedback ({user.submissions.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user.submissions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No submissions yet
            </p>
          ) : (
            user.submissions.map((sub: any, index: number) => (
              <div key={sub.id}>
                {index > 0 && <Separator className="mb-4" />}
                <div className="space-y-2">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {submissionTypeIcons[sub.type]}
                      <span className="font-medium text-sm">{sub.title}</span>
                      <Badge variant="outline" className="text-xs">
                        {sub.type}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {format(new Date(sub.createdAt), "MMM d, yyyy")}
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {sub.description}
                  </p>
                  <div className="text-xs text-muted-foreground">
                    <Link
                      href={`/projects/${sub.project.id}`}
                      className="text-blue-400 hover:underline"
                    >
                      {sub.project.title}
                    </Link>
                    {" / "}
                    {sub.phase.phaseName}
                  </div>

                  {sub.feedback.length > 0 && (
                    <div className="space-y-2 ml-4">
                      {sub.feedback.map((fb: any) => (
                        <div
                          key={fb.id}
                          className="p-2 rounded bg-accent/50 text-sm"
                        >
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
                            <span className="text-xs text-muted-foreground">
                              {format(new Date(fb.createdAt), "MMM d")}
                            </span>
                          </div>
                          <p className="text-muted-foreground">{fb.text}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
