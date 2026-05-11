import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, FileText, Users } from "lucide-react";

type ActivityItem = {
  title: string;
  phaseName: string;
  user: { name: string };
  createdAt: string;
};

type TeamMember = {
  user: { id: string; name: string; avatarColor: string };
};

export function ProjectRightRail({
  recentActivity,
  overdueTaskCount,
  pendingExtensionCount,
  assignees,
}: {
  recentActivity: ActivityItem[];
  overdueTaskCount: number;
  pendingExtensionCount: number;
  assignees?: TeamMember[];
}) {
  return (
    <aside className="space-y-6">
      {/* Team */}
      {assignees && assignees.length > 0 && (
        <div className="rounded-lg border border-border bg-bg p-4">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            <Users className="h-3.5 w-3.5" />
            Team ({assignees.length})
          </h3>
          <ul className="space-y-2">
            {assignees.map(a => (
              <li key={a.user.id} className="flex items-center gap-2 text-sm">
                <span
                  className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                  )}
                  style={{ backgroundColor: a.user.avatarColor }}
                  title={a.user.name}
                >
                  {a.user.name
                    .split(" ")
                    .map(n => n.charAt(0))
                    .join("")
                    .slice(0, 2)
                    .toUpperCase()}
                </span>
                <span className="truncate text-fg">{a.user.name}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Insights */}
      {(overdueTaskCount > 0 || pendingExtensionCount > 0) && (
        <div className="rounded-lg border border-border bg-bg p-4 space-y-2">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-3">Project Signals</h3>
          {overdueTaskCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-danger" />
              <span className="text-fg">{overdueTaskCount} overdue task{overdueTaskCount !== 1 ? "s" : ""}</span>
            </div>
          )}
          {pendingExtensionCount > 0 && (
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-3.5 w-3.5 shrink-0 text-warning" />
              <span className="text-fg">{pendingExtensionCount} pending extension{pendingExtensionCount !== 1 ? "s" : ""}</span>
            </div>
          )}
        </div>
      )}

      {/* Recent activity */}
      <div className="rounded-lg border border-border bg-bg p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-fg-muted mb-3">Recent Activity</h3>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-fg-muted">No submissions yet</p>
        ) : (
          <ul className="space-y-3">
            {recentActivity.map(item => (
              <li key={item.createdAt + item.title} className="flex items-start gap-2 text-sm">
                <FileText className="h-3.5 w-3.5 shrink-0 mt-0.5 text-fg-muted" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-fg">{item.title}</p>
                  <p className="text-xs text-fg-muted">{item.user.name} · {item.phaseName}</p>
                  <p className="text-xs text-fg-muted">{formatDistanceToNow(new Date(item.createdAt), { addSuffix: true })}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}
