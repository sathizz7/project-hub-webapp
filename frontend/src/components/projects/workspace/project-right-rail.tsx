import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import { AlertTriangle, Clock, FileText } from "lucide-react";

type ActivityItem = {
  title: string;
  phaseName: string;
  user: { name: string };
  createdAt: string;
};

export function ProjectRightRail({
  recentActivity,
  overdueTaskCount,
  pendingExtensionCount,
}: {
  recentActivity: ActivityItem[];
  overdueTaskCount: number;
  pendingExtensionCount: number;
}) {
  return (
    <aside className="space-y-6">
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
