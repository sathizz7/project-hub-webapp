"use client";

import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/primitives";
import { EmptyState } from "@/components/primitives";
import { FileText, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT, STATUS_PILL, PROJECT_TYPE_COLORS } from "@/lib/design-tokens";
import type { ProjectWorkspaceData } from "./types";
import { OverviewTab } from "./tabs/overview-tab";
import { PhasesTab } from "./tabs/phases-tab";
import { TasksTab } from "./tabs/tasks-tab";
import { SubmissionsTab } from "./tabs/submissions-tab";
import { ExtensionsTab } from "./tabs/extensions-tab";
import { ProjectRightRail } from "./project-right-rail";

export function ProjectWorkspace({ data }: { data: ProjectWorkspaceData }) {
  const typeClass = PROJECT_TYPE_COLORS[data.type] ?? PROJECT_TYPE_COLORS["engineering"];
  const statusClass = STATUS_PILL[data.status] ?? STATUS_PILL["active"];

  const recentActivity = data.phases
    .flatMap(p => p.submissions.map(s => ({ ...s, phaseName: p.phaseName })))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  const overdueCount = data.tasks.filter(
    t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== "completed" && t.status !== "killed"
  ).length;

  const pendingExtCount = data.extensions.filter(e => e.status === "pending").length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <PageHeader
        title={data.title}
        breadcrumb={<span className="text-fg-muted">Projects / {data.title}</span>}
      >
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <Badge className={cn("text-xs font-medium", typeClass)}>{data.type.replace("_", " ")}</Badge>
          <Badge className={cn("text-xs font-medium", statusClass)}>{data.status}</Badge>
          <span className="flex items-center gap-1 text-xs">
            <span className={cn("h-2 w-2 rounded-full", PRIORITY_DOT[data.priority])} />
            <span className="text-fg-muted capitalize">{data.priority}</span>
          </span>
          {data.currentPhase && (
            <span className="text-xs text-fg-muted border border-border rounded px-1.5 py-0.5">{data.currentPhase}</span>
          )}
        </div>
      </PageHeader>

      {/* Main grid: tabs left, rail right */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_272px]">
        {/* Tabs */}
        <div>
          <Tabs defaultValue="overview">
            <TabsList variant="line" className="mb-6 w-full justify-start gap-0 rounded-none border-b border-border bg-transparent p-0">
              {(["overview", "phases", "tasks", "submissions", "extensions", "documents", "discussions"] as const).map(tab => (
                <TabsTrigger key={tab} value={tab} className="rounded-none px-4 py-2 capitalize text-sm">
                  {tab}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="overview">
              <OverviewTab
                requirement={data.requirement}
                aiPlan={data.aiPlan}
                techStack={data.techStack}
                checkpoints={data.checkpoints}
              />
            </TabsContent>

            <TabsContent value="phases">
              <PhasesTab phases={data.phases} projectId={data.id} projectStatus={data.status} />
            </TabsContent>

            <TabsContent value="tasks">
              <TasksTab
                tasks={data.tasks}
                assignees={data.assignees}
                phases={data.phases}
                projectId={data.id}
              />
            </TabsContent>

            <TabsContent value="submissions">
              <SubmissionsTab phases={data.phases} />
            </TabsContent>

            <TabsContent value="extensions">
              <ExtensionsTab extensions={data.extensions} />
            </TabsContent>

            <TabsContent value="documents">
              <EmptyState icon={FileText} title="Documents" description="Document management coming in a future update." />
            </TabsContent>

            <TabsContent value="discussions">
              <EmptyState icon={MessageSquare} title="Discussions" description="Discussion threads coming in a future update." />
            </TabsContent>
          </Tabs>
        </div>

        {/* Right rail */}
        <ProjectRightRail
          recentActivity={recentActivity}
          overdueTaskCount={overdueCount}
          pendingExtensionCount={pendingExtCount}
          assignees={data.assignees}
        />
      </div>
    </div>
  );
}
