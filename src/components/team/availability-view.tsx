"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/primitives";
import { CalendarDays } from "lucide-react";
import { format } from "date-fns";
import type { SerializedLeaveRequest, WeekDay } from "@/lib/team-helpers";

const LEAVE_TYPE_LABEL: Record<string, string> = {
  planned: "Planned", sick: "Sick", personal: "Personal", wfh: "WFH", half_day: "Half day",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-amber-50 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  approved: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  rejected: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

function WeekStrip({ weekDays }: { weekDays: WeekDay[] }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-4">
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">This Week</h3>
      <div className="grid grid-cols-7 gap-2">
        {weekDays.map(day => (
          <div key={day.date} className="text-center">
            <p className="text-[10px] font-medium text-fg-muted mb-1.5">{day.label}</p>
            {day.leavingUsers.length === 0 ? (
              <div className="h-2 w-2 rounded-full bg-emerald-400 mx-auto" title="All available" />
            ) : (
              <div className="flex flex-wrap justify-center gap-0.5">
                {day.leavingUsers.slice(0, 4).map(u => (
                  <span
                    key={u.id}
                    className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold text-white"
                    style={{ backgroundColor: u.avatarColor }}
                    title={`${u.name} on leave`}
                  >
                    {u.name[0]}
                  </span>
                ))}
                {day.leavingUsers.length > 4 && (
                  <span className="text-[9px] text-fg-muted">+{day.leavingUsers.length - 4}</span>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function LeaveRow({
  leave,
  onDecide,
}: {
  leave: SerializedLeaveRequest;
  onDecide?: (id: string, status: "approved" | "rejected") => void;
}) {
  const [acting, setActing] = useState(false);

  async function decide(status: "approved" | "rejected") {
    setActing(true);
    await onDecide?.(leave.id, status);
    setActing(false);
  }

  return (
    <div className={cn("rounded-lg border bg-bg p-4", leave.status === "pending" ? "border-accent/30" : "border-border")}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
            style={{ backgroundColor: leave.user.avatarColor }}
          >
            {leave.user.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
          </span>
          <div>
            <p className="font-medium text-sm text-fg">{leave.user.name}</p>
            <p className="text-xs text-fg-muted">
              {format(new Date(leave.startDate), "MMM d")} – {format(new Date(leave.endDate), "MMM d")} · {leave.days} day{leave.days !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge className="text-[11px]">{LEAVE_TYPE_LABEL[leave.type] ?? leave.type}</Badge>
          <Badge className={cn("text-[11px]", STATUS_COLORS[leave.status] ?? "")}>{leave.status}</Badge>
        </div>
      </div>

      {leave.reason && <p className="text-xs text-fg-muted mt-2">{leave.reason}</p>}
      {leave.contingencyNote && <p className="text-xs text-fg-muted mt-1 italic">"{leave.contingencyNote}"</p>}

      {leave.status === "pending" && onDecide && (
        <div className="flex gap-2 mt-3">
          <Button size="sm" variant="outline" className="text-success border-success hover:bg-success/10 text-xs" disabled={acting} onClick={() => decide("approved")}>
            {acting ? "…" : "Approve"}
          </Button>
          <Button size="sm" variant="outline" className="text-danger border-danger hover:bg-danger/10 text-xs" disabled={acting} onClick={() => decide("rejected")}>
            {acting ? "…" : "Reject"}
          </Button>
        </div>
      )}
    </div>
  );
}

export function AvailabilityView({
  weekDays,
  pendingLeaves,
  upcomingLeaves,
  ceoId,
}: {
  weekDays: WeekDay[];
  pendingLeaves: SerializedLeaveRequest[];
  upcomingLeaves: SerializedLeaveRequest[];
  ceoId: string;
}) {
  const router = useRouter();

  async function handleDecide(id: string, status: "approved" | "rejected") {
    await fetch(`/api/leave-requests/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, approvedById: ceoId }),
    });
    router.refresh();
  }

  const onLeaveToday = weekDays[0]?.leavingUsers.length ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Leave & Availability"
        description={`${pendingLeaves.length} pending · ${onLeaveToday} on leave today`}
      />

      <WeekStrip weekDays={weekDays} />

      {pendingLeaves.length > 0 && (
        <section>
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
            Pending Approval ({pendingLeaves.length})
          </h3>
          <div className="space-y-3">
            {pendingLeaves.map(l => (
              <LeaveRow key={l.id} leave={l} onDecide={handleDecide} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-fg-muted">
          Upcoming & Recent ({upcomingLeaves.length})
        </h3>
        {upcomingLeaves.length === 0 ? (
          <EmptyState icon={CalendarDays} title="No upcoming leaves" description="No approved leaves in the next 30 days." />
        ) : (
          <div className="space-y-3">
            {upcomingLeaves.map(l => (
              <LeaveRow key={l.id} leave={l} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
