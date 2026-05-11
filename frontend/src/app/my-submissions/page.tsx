import { redirect } from "next/navigation";
import { apiServerFetch } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { PageHeader, EmptyState } from "@/components/primitives";
import { Badge } from "@/components/ui/badge";
import { Inbox, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

type MySubmission = {
  id: string;
  project_id: string | null;
  phase_id: string | null;
  user_id: string;
  title: string;
  type: "document" | "code" | "architecture" | "notebook" | "demo";
  description: string | null;
  link: string | null;
  created_at: string;
};

type ProjectListRow = {
  id: string;
  title: string;
};

const TYPE_PILL_CLS: Record<MySubmission["type"], string> = {
  document: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200",
  code: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200",
  architecture: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-200",
  notebook: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
  demo: "bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-200",
};

export default async function MySubmissionsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const [submissions, projects] = await Promise.all([
    apiServerFetch<MySubmission[]>(`/api/v1/submissions?user_id=${user.id}`),
    apiServerFetch<ProjectListRow[]>("/api/v1/projects"),
  ]);

  const projectTitleById = new Map(projects.map(p => [p.id, p.title]));

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Submissions"
        breadcrumb={<span className="text-fg-muted">{user.name} / My Submissions</span>}
      />

      {submissions.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No submissions yet"
          description="Documents, code, and demos you submit on any project will appear here."
        />
      ) : (
        <ul className="space-y-2">
          {submissions.map(s => (
            <li
              key={s.id}
              className="rounded-md border border-border bg-bg p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-fg">{s.title}</p>
                    <Badge className={cn("text-[11px] capitalize", TYPE_PILL_CLS[s.type])}>
                      {s.type}
                    </Badge>
                  </div>
                  {s.description && (
                    <p className="mt-1 text-sm text-fg-muted">{s.description}</p>
                  )}
                  <p className="mt-1 text-xs text-fg-muted">
                    {s.project_id && projectTitleById.has(s.project_id)
                      ? projectTitleById.get(s.project_id)
                      : "No project"}
                    {" · "}
                    {formatDistanceToNow(new Date(s.created_at), { addSuffix: true })}
                  </p>
                </div>
                {s.link && (
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 text-sm text-accent hover:underline inline-flex items-center gap-1"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
