import * as React from "react";
import { CalendarDays, ListTodo } from "lucide-react";
import { cn } from "@/lib/utils";

export type TodayWeekCardProps = {
  activeLeavesToday: { userName: string }[];
  upcomingLeaveCount: number;
  tasksThisWeek: { id: string; title: string; dueDate: Date }[];
  className?: string;
};

export function TodayWeekCard({ activeLeavesToday, upcomingLeaveCount, tasksThisWeek, className }: TodayWeekCardProps) {
  return (
    <div className={cn("rounded-lg border border-border bg-bg p-5 shadow-sm space-y-4", className)}>
      {/* Today */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
          <CalendarDays className="h-3.5 w-3.5" />
          Today
          {upcomingLeaveCount > 0 && (
            <span className="ml-auto text-xs font-normal text-fg-muted normal-case tracking-normal">
              {upcomingLeaveCount} upcoming
            </span>
          )}
        </div>
        {activeLeavesToday.length === 0 ? (
          <p className="text-sm text-fg-muted">No one on leave today</p>
        ) : (
          <ul className="space-y-1">
            {activeLeavesToday.map(l => (
              <li key={l.userName} className="flex items-center gap-2 text-sm text-fg">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-fg">
                  {l.userName.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </span>
                {l.userName}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="border-t border-border" />

      {/* Week ahead */}
      <div>
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-fg-muted mb-2">
          <ListTodo className="h-3.5 w-3.5" />
          Week ahead
        </div>
        {tasksThisWeek.length === 0 ? (
          <p className="text-sm text-fg-muted">No tasks this week</p>
        ) : (
          <ul className="space-y-1">
            {tasksThisWeek.map(t => (
              <li key={t.id} className="flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-fg">{t.title}</span>
                <span className="shrink-0 text-xs text-fg-muted">
                  {t.dueDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
