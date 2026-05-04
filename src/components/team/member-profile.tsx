"use client";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader, TaskRow, EmptyState } from "@/components/primitives";
import { CheckSquare, FileText, Calendar } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { deriveDepartment, type SerializedMember, type SerializedLeaveRequest } from "@/lib/team-helpers";

type SerializedTask = {
  id: string; title: string;
  priority: "low" | "medium" | "high" | "critical";
  status: string; dueDate: string | null;
  project: { id: string; title: string };
};

type SerializedSubmission = {
  id: string; title: string; type: string; createdAt: string;
  project: { id: string; title: string };
  phase: { phaseName: string };
  feedbackCount: number;
};

type MemberProfileData = {
  member: SerializedMember;
  activeProjects: Array<{ id: string; title: string; type: string; status: string; currentPhase: string }>;
  tasks: SerializedTask[];
  recentSubmissions: SerializedSubmission[];
  leaves: SerializedLeaveRequest[];
};

const LEAVE_TYPE_LABEL: Record<string, string> = {
  planned: "Planned", sick: "Sick", personal: "Personal", wfh: "WFH", half_day: "Half day",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

export function MemberProfile({ data }: { data: MemberProfileData }) {
  const { member, activeProjects, tasks, recentSubmissions, leaves } = data;
  const initials = member.name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
  const dept = deriveDepartment(member.role);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-4">
        <span
          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-lg font-bold text-white"
          style={{ backgroundColor: member.avatarColor }}
        >
          {initials}
        </span>
        <div>
          <h1 className="text-xl font-semibold text-fg">{member.name}</h1>
          <p className="text-sm text-fg-muted">{member.role}</p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <Badge className="text-[11px]">{dept}</Badge>
            <span className="text-xs text-fg-muted">Score: <strong className="text-fg">{member.performance.score}</strong>/100</span>
            <span className="text-xs text-fg-muted">{member.performance.submissionsCount} submissions</span>
            {member.performance.avgResponseHours > 0 && (
              <span className="text-xs text-fg-muted">~{member.performance.avgResponseHours.toFixed(0)}h avg response</span>
            )}
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList variant="line" className="w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0 mb-6">
          {(["overview", "tasks", "leaves"] as const).map(tab => (
            <TabsTrigger key={tab} value={tab} className="rounded-none px-4 py-2 capitalize text-sm">{tab}</TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <div className="space-y-6">
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Active Projects ({activeProjects.length})</h3>
              {activeProjects.length === 0 ? (
                <p className="text-sm text-fg-muted">No active projects.</p>
              ) : (
                <div className="space-y-2">
                  {activeProjects.map(p => (
                    <a key={p.id} href={`/projects/${p.id}`} className="flex items-center justify-between rounded-md border border-border bg-bg px-4 py-2.5 hover:bg-bg-subtle transition-colors">
                      <div>
                        <p className="font-medium text-sm text-fg">{p.title}</p>
                        <p className="text-xs text-fg-muted">{p.currentPhase || p.type}</p>
                      </div>
                      <Badge variant="outline" className="text-[11px] capitalize shrink-0">{p.status}</Badge>
                    </a>
                  ))}
                </div>
              )}
            </section>
            <section>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">Recent Submissions</h3>
              {recentSubmissions.length === 0 ? (
                <p className="text-sm text-fg-muted">No submissions yet.</p>
              ) : (
                <div className="space-y-2">
                  {recentSubmissions.map(s => (
                    <div key={s.id} className="rounded-md border border-border bg-bg px-4 py-2.5">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="truncate font-medium text-sm text-fg">{s.title}</span>
                        <Badge variant="outline" className="text-[11px] shrink-0">{s.type}</Badge>
                      </div>
                      <p className="text-xs text-fg-muted">
                        {s.project.title} · {s.phase.phaseName} · {s.feedbackCount} feedback · {formatDistanceToNow(new Date(s.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>
        </TabsContent>

        <TabsContent value="tasks">
          {tasks.length === 0 ? (
            <EmptyState icon={CheckSquare} title="No tasks" description="No tasks assigned to this member." />
          ) : (
            <div className="rounded-md border border-border bg-bg p-2">
              {tasks.map(t => (
                <TaskRow
                  key={t.id}
                  title={t.title}
                  assigneeName={member.name}
                  due={t.dueDate ? formatDistanceToNow(new Date(t.dueDate), { addSuffix: true }) : undefined}
                  priority={t.priority}
                  done={t.status === "completed"}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="leaves">
          {leaves.length === 0 ? (
            <EmptyState icon={Calendar} title="No leaves" description="No leave requests for this member." />
          ) : (
            <div className="space-y-2">
              {leaves.map(l => (
                <div key={l.id} className="rounded-md border border-border bg-bg px-4 py-3">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-sm font-medium text-fg">
                      {format(new Date(l.startDate), "MMM d")} – {format(new Date(l.endDate), "MMM d, yyyy")}
                    </span>
                    <Badge className="text-[11px]">{LEAVE_TYPE_LABEL[l.type] ?? l.type}</Badge>
                    <Badge className={cn("text-[11px]", STATUS_COLORS[l.status] ?? "")}>{l.status}</Badge>
                  </div>
                  {l.reason && <p className="text-xs text-fg-muted">{l.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
