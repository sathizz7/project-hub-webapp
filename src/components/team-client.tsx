"use client";

import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  FolderKanban,
  FileText,
  MessageSquare,
} from "lucide-react";

export function TeamClient({ users }: { users: any[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Team</h1>
        <p className="text-muted-foreground mt-1">
          {users.length} team member{users.length !== 1 ? "s" : ""}
        </p>
      </div>

      {users.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No team members yet. Seed the database to add team members.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const activeProjects = user.assignedProjects.filter(
              (ap: any) => ap.project.status === "active"
            ).length;
            const totalProjects = user.assignedProjects.length;
            const totalSubmissions = user.submissions.length;
            const feedbackReceived = user.submissions.reduce(
              (sum: number, s: any) => sum + s.feedback.length,
              0
            );

            return (
              <Link key={user.id} href={`/team/${user.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-3">
                    <div className="flex items-center gap-3">
                      <div
                        className="h-12 w-12 rounded-full flex items-center justify-center text-lg font-bold text-white"
                        style={{ backgroundColor: user.avatarColor }}
                      >
                        {user.name[0]}
                      </div>
                      <div>
                        <CardTitle className="text-base">{user.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          {user.role}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="space-y-1">
                        <FolderKanban className="h-4 w-4 mx-auto text-blue-400" />
                        <p className="text-lg font-bold">{activeProjects}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Active
                        </p>
                      </div>
                      <div className="space-y-1">
                        <FileText className="h-4 w-4 mx-auto text-purple-400" />
                        <p className="text-lg font-bold">{totalSubmissions}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Submissions
                        </p>
                      </div>
                      <div className="space-y-1">
                        <MessageSquare className="h-4 w-4 mx-auto text-green-400" />
                        <p className="text-lg font-bold">{feedbackReceived}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Feedback
                        </p>
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
