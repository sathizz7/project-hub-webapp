"use client";

import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  FolderKanban,
  FileText,
  CheckCircle2,
  Clock,
  Mail,
} from "lucide-react";
import { PROJECTS, USERS } from "@/lib/mock-data";

// Mock performance data keyed by user id
const MOCK_PERFORMANCE: Record<
  string,
  { score: number; avgResponseTime: string }
> = {
  u2: { score: 88, avgResponseTime: "4.2h" },
  u3: { score: 95, avgResponseTime: "2.1h" },
  u4: { score: 82, avgResponseTime: "5.8h" },
  u5: { score: 78, avgResponseTime: "6.3h" },
};

function getScoreColor(score: number): string {
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 70) return "bg-amber-500";
  return "bg-red-500";
}

function getScoreLabel(score: number): string {
  if (score >= 90) return "Excellent";
  if (score >= 80) return "Good";
  if (score >= 70) return "Average";
  return "Needs Improvement";
}

export default function TeamPage() {
  const teamMembers = USERS.filter((u) => u.id !== "u1"); // exclude CEO

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Users className="h-7 w-7 text-purple-600" />
          Team Performance
        </h1>
        <p className="text-muted-foreground mt-1">
          Overview of team member activity and performance metrics
        </p>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teamMembers.map((user) => {
          const activeProjects = PROJECTS.filter(
            (p) => p.assigneeIds.includes(user.id) && p.status === "active"
          );
          const allUserProjects = PROJECTS.filter((p) =>
            p.assigneeIds.includes(user.id)
          );
          const totalSubmissions = PROJECTS.flatMap((p) =>
            p.updates.filter((u) => u.userId === user.id)
          );
          const reviewedSubmissions = totalSubmissions.filter((u) => u.reviewed);
          const perf = MOCK_PERFORMANCE[user.id] || {
            score: 75,
            avgResponseTime: "N/A",
          };

          return (
            <Link key={user.id} href={`/team/${user.id}`}>
              <Card className="hover:bg-gray-100 transition-colors cursor-pointer h-full">
                <CardContent className="pt-6 space-y-4">
                  {/* Profile header */}
                  <div className="flex items-center gap-4">
                    <div
                      className="h-14 w-14 rounded-full flex items-center justify-center text-lg font-bold text-white shrink-0"
                      style={{ backgroundColor: user.avatarColor }}
                    >
                      {user.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base">{user.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-sm text-muted-foreground">
                          {user.role}
                        </p>
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-gray-50 text-gray-600 border-gray-200">
                          {user.department}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="p-2 rounded-lg bg-gray-100">
                      <div className="flex items-center justify-center mb-1">
                        <FolderKanban className="h-3.5 w-3.5 text-blue-600" />
                      </div>
                      <p className="text-lg font-bold">
                        {activeProjects.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Active
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <div className="flex items-center justify-center mb-1">
                        <FileText className="h-3.5 w-3.5 text-amber-600" />
                      </div>
                      <p className="text-lg font-bold">
                        {totalSubmissions.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Submissions
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <div className="flex items-center justify-center mb-1">
                        <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                      </div>
                      <p className="text-lg font-bold">
                        {reviewedSubmissions.length}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Reviewed
                      </p>
                    </div>
                    <div className="p-2 rounded-lg bg-gray-100">
                      <div className="flex items-center justify-center mb-1">
                        <Clock className="h-3.5 w-3.5 text-purple-600" />
                      </div>
                      <p className="text-lg font-bold">
                        {perf.avgResponseTime}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        Avg Resp
                      </p>
                    </div>
                  </div>

                  {/* Performance Score */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Performance Score
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            perf.score >= 90
                              ? "text-green-700 border-green-200 bg-green-50"
                              : perf.score >= 80
                              ? "text-blue-700 border-blue-200 bg-blue-50"
                              : perf.score >= 70
                              ? "text-amber-700 border-amber-200 bg-amber-50"
                              : "text-red-700 border-red-200 bg-red-50"
                          }`}
                        >
                          {getScoreLabel(perf.score)}
                        </Badge>
                        <span className="text-sm font-bold">{perf.score}%</span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${getScoreColor(perf.score)}`}
                        style={{ width: `${perf.score}%` }}
                      />
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
