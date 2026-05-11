import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { PageHeader, EmptyState } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";
import { PRIORITY_DOT } from "@/lib/design-tokens";
import { formatDistanceToNow } from "date-fns";

type MyTask = {
  id: string;
  project_id: string | null;
  phase_id: string | null;
  assignee_id: string | null;
  title: string;
  description: string | null;
  due_date: string | null;
  priority: "low" | "medium" | "high" | "critical";
  status: "planning" | "in_progress" | "blocked" | "completed" | "killed";
  created_at: string;
  updated_at: string | null;
  completed_at: string | null;
};

type ProjectListRow = {
  id: string;
  title: string;
};

const STATUS_LABEL: Record<MyTask["status"], string> = {
  planning: "Planning",
  in_progress: "In Progress",
  blocked: "Blocked",
  completed: "Completed",
  killed: "Killed",
};

const STATUS_PILL_CLS: Record<MyTask["status"], string> = {
  planning: "bg-bg-muted text-fg-muted",
  in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  blocked: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  killed: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

export default async function MyTasksPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [tasks, projects] = await Promise.all([
    apiServerFetch<MyTask[]>("/api/v1/my/tasks"),
    apiServerFetch<ProjectListRow[]>("/api/v1/projects"),
  ]);

  const projectTitleById = new Map(projects.map(p => [p.id, p.title]));

  const active = tasks.filter(t => t.status !== "completed" && t.status !== "killed");
  const done = tasks.filter(t => t.status === "completed" || t.status === "killed");

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Tasks"
        breadcrumb={<span className="text-fg-muted">{user.name} / My Tasks</span>}
      />

      {tasks.length === 0 ? (
        <EmptyState
          icon={ListTodo}
          title="No tasks assigned to you"
          description="Tasks assigned to you across all your projects will appear here."
        />
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Active ({active.length})
              </h2>
              <ul className="space-y-2">
                {active.map(t => (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-bg p-3"
                  >
                    <span
                      aria-label={`${t.priority} priority`}
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[t.priority])}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fg">{t.title}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {t.project_id && projectTitleById.has(t.project_id)
                          ? projectTitleById.get(t.project_id)
                          : "No project"}
                        {t.due_date && (
                          <> &middot; Due {formatDistanceToNow(new Date(t.due_date), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                    <Badge className={cn("shrink-0 text-[11px]", STATUS_PILL_CLS[t.status])}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {done.length > 0 && (
            <section>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
                Completed ({done.length})
              </h2>
              <ul className="space-y-2">
                {done.map(t => (
                  <li
                    key={t.id}
                    className="flex items-start gap-3 rounded-md border border-border bg-bg p-3 opacity-75"
                  >
                    <span
                      className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", PRIORITY_DOT[t.priority])}
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-fg line-through">{t.title}</p>
                      <p className="text-xs text-fg-muted mt-0.5">
                        {t.project_id && projectTitleById.has(t.project_id)
                          ? projectTitleById.get(t.project_id)
                          : "No project"}
                        {t.completed_at && (
                          <> &middot; Completed {formatDistanceToNow(new Date(t.completed_at), { addSuffix: true })}</>
                        )}
                      </p>
                    </div>
                    <Badge className={cn("shrink-0 text-[11px]", STATUS_PILL_CLS[t.status])}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
