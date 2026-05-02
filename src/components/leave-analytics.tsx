"use client";

import { useMemo } from "react";
import {
  parseISO,
  differenceInCalendarDays,
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isAfter,
  isBefore,
  isWithinInterval,
} from "date-fns";
import { Eye, X, AlertTriangle, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  getLeavesByUser,
  getUser,
  LEAVE_REQUESTS,
  type LeaveRequest,
  type LeaveType,
} from "@/lib/mock-data";

interface LeaveAnalyticsProps {
  userId: string;
  onClose: () => void;
}

const FY_START = new Date(2025, 3, 1);
const FY_END = new Date(2026, 2, 31);

const TYPE_LABELS: Record<LeaveType, string> = {
  planned: "Planned Leave",
  sick: "Sick Leave",
  personal: "Personal Leave",
  wfh: "Work from Home",
  half_day: "Half Day",
};

function isInFY(leave: LeaveRequest): boolean {
  const start = parseISO(leave.startDate);
  return isWithinInterval(start, { start: FY_START, end: FY_END });
}

function isUnplanned(leave: LeaveRequest): boolean {
  const created = parseISO(leave.createdAt);
  const start = parseISO(leave.startDate);
  return differenceInCalendarDays(start, created) <= 1;
}

export function LeaveAnalytics({ userId, onClose }: LeaveAnalyticsProps) {
  const allLeaves = useMemo(() => getLeavesByUser(userId), [userId]);
  const user = getUser(userId);
  const fyLeaves = useMemo(() => allLeaves.filter(isInFY), [allLeaves]);

  // Breakdown by type
  const breakdown = useMemo(() => {
    const result: Record<LeaveType, { days: number; count: number; reasons: string[] }> = {
      planned: { days: 0, count: 0, reasons: [] },
      sick: { days: 0, count: 0, reasons: [] },
      personal: { days: 0, count: 0, reasons: [] },
      wfh: { days: 0, count: 0, reasons: [] },
      half_day: { days: 0, count: 0, reasons: [] },
    };
    for (const l of fyLeaves) {
      result[l.type].days += l.days;
      result[l.type].count += 1;
      if (l.reason && !result[l.type].reasons.includes(l.reason)) {
        result[l.type].reasons.push(l.reason);
      }
    }
    return result;
  }, [fyLeaves]);

  // Totals
  const totalDaysOff = fyLeaves.filter(l => l.type !== "wfh").reduce((s, l) => s + l.days, 0);
  const totalWfh = breakdown.wfh.days;
  const totalLeaves = fyLeaves.filter(l => l.type !== "wfh").length;

  // Unplanned analysis
  const nonWfhLeaves = fyLeaves.filter(l => l.type !== "wfh");
  const unplannedLeaves = nonWfhLeaves.filter(isUnplanned);
  const unplannedDays = unplannedLeaves.reduce((s, l) => s + l.days, 0);
  const unplannedPct = totalDaysOff > 0 ? Math.round((unplannedDays / totalDaysOff) * 100) : 0;

  // Last-minute leaves (same day)
  const lastMinuteLeaves = nonWfhLeaves.filter(l => {
    const created = parseISO(l.createdAt);
    const start = parseISO(l.startDate);
    return differenceInCalendarDays(start, created) === 0;
  });

  // Monthly pattern — last 3 months
  const monthlyPattern = useMemo(() => {
    const now = new Date();
    const months: { label: string; days: number }[] = [];
    for (let i = 2; i >= 0; i--) {
      const ref = subMonths(now, i);
      const mStart = startOfMonth(ref);
      const mEnd = endOfMonth(ref);
      const days = fyLeaves
        .filter(l => {
          const s = parseISO(l.startDate);
          return l.type !== "wfh" && !isBefore(s, mStart) && !isAfter(s, mEnd);
        })
        .reduce((sum, l) => sum + l.days, 0);
      months.push({ label: format(ref, "MMMM"), days });
    }
    return months;
  }, [fyLeaves]);

  // Team average
  const teamAvg = useMemo(() => {
    const userDays: Record<string, number> = {};
    for (const l of LEAVE_REQUESTS) {
      if (!isInFY(l) || l.type === "wfh") continue;
      userDays[l.userId] = (userDays[l.userId] || 0) + l.days;
    }
    const values = Object.values(userDays);
    return values.length > 0 ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10 : 0;
  }, []);

  // AI Insights — text-based, frank
  const insights = useMemo(() => {
    const msgs: { type: "warning" | "info" | "positive"; text: string }[] = [];

    if (breakdown.sick.count >= 3) {
      msgs.push({ type: "warning", text: `${breakdown.sick.count} sick leave instances this year — frequent pattern, may need attention.` });
    } else if (breakdown.sick.count >= 2) {
      msgs.push({ type: "info", text: `${breakdown.sick.count} sick leaves taken — within normal range.` });
    }

    if (unplannedPct > 50) {
      msgs.push({ type: "warning", text: `${unplannedPct}% of leaves were unplanned (requested same day or day before). This is high — planning needs improvement.` });
    } else if (unplannedPct > 25) {
      msgs.push({ type: "info", text: `${unplannedPct}% of leaves were unplanned — moderate, could be improved.` });
    } else if (totalLeaves > 0) {
      msgs.push({ type: "positive", text: `Most leaves were planned well in advance. Good planning discipline.` });
    }

    if (lastMinuteLeaves.length > 0) {
      msgs.push({ type: "warning", text: `${lastMinuteLeaves.length} same-day leave request${lastMinuteLeaves.length > 1 ? "s" : ""} — applied on the day itself.` });
    }

    if (totalDaysOff > teamAvg + 3) {
      msgs.push({ type: "warning", text: `Total ${totalDaysOff} days off is above team average of ${teamAvg} days.` });
    } else if (totalDaysOff <= teamAvg) {
      msgs.push({ type: "positive", text: `Total ${totalDaysOff} days off is at or below team average (${teamAvg} days).` });
    }

    if (totalWfh >= 3) {
      msgs.push({ type: "info", text: `${totalWfh} WFH days this year. Consider if a regular WFH day would help.` });
    }

    return msgs.slice(0, 5);
  }, [breakdown, unplannedPct, lastMinuteLeaves, totalDaysOff, totalLeaves, totalWfh, teamAvg]);

  return (
    <Card className="border-violet-200 bg-gradient-to-br from-violet-50/30 to-white shadow-sm">
      <CardHeader className="pb-2 pt-4 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-violet-500" />
            <h3 className="text-sm font-semibold">
              Leave Summary — {user?.name ?? "Unknown"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Financial Year: Apr 2025 – Mar 2026
        </p>
      </CardHeader>

      <CardContent className="px-4 pb-4 space-y-3">
        {/* ── Overall Numbers ── */}
        <div className="bg-white border border-gray-100 rounded-lg p-3 space-y-1.5">
          <p className="text-sm">
            <span className="font-semibold">{totalDaysOff} day{totalDaysOff !== 1 ? "s" : ""}</span> off this year
            {totalWfh > 0 && <span className="text-teal-600"> + {totalWfh} WFH day{totalWfh !== 1 ? "s" : ""}</span>}
          </p>
          <p className="text-xs text-muted-foreground">
            Team average: {teamAvg} days off
            {totalDaysOff > teamAvg + 2 && <span className="text-red-600 font-medium"> (above average)</span>}
            {totalDaysOff <= teamAvg && <span className="text-green-600 font-medium"> (at or below average)</span>}
          </p>
        </div>

        <Separator className="bg-gray-100" />

        {/* ── Type-by-type breakdown ── */}
        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Breakdown</h4>

          {breakdown.sick.count > 0 && (
            <div className="text-sm space-y-0.5">
              <p>
                <span className="font-medium text-red-700">Sick Leave:</span>{" "}
                {breakdown.sick.days} day{breakdown.sick.days !== 1 ? "s" : ""} ({breakdown.sick.count} time{breakdown.sick.count !== 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground pl-3">
                Reasons: {breakdown.sick.reasons.join(", ")}
              </p>
            </div>
          )}

          {breakdown.planned.count > 0 && (
            <div className="text-sm space-y-0.5">
              <p>
                <span className="font-medium text-blue-700">Planned Leave:</span>{" "}
                {breakdown.planned.days} day{breakdown.planned.days !== 1 ? "s" : ""} ({breakdown.planned.count} time{breakdown.planned.count !== 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground pl-3">
                Reasons: {breakdown.planned.reasons.join(", ")}
              </p>
            </div>
          )}

          {breakdown.personal.count > 0 && (
            <div className="text-sm space-y-0.5">
              <p>
                <span className="font-medium text-purple-700">Personal Leave:</span>{" "}
                {breakdown.personal.days} day{breakdown.personal.days !== 1 ? "s" : ""} ({breakdown.personal.count} time{breakdown.personal.count !== 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground pl-3">
                Reasons: {breakdown.personal.reasons.join(", ")}
              </p>
            </div>
          )}

          {breakdown.wfh.count > 0 && (
            <div className="text-sm space-y-0.5">
              <p>
                <span className="font-medium text-teal-700">Work from Home:</span>{" "}
                {breakdown.wfh.days} day{breakdown.wfh.days !== 1 ? "s" : ""} ({breakdown.wfh.count} time{breakdown.wfh.count !== 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground pl-3">
                Reasons: {breakdown.wfh.reasons.join(", ")}
              </p>
            </div>
          )}

          {breakdown.half_day.count > 0 && (
            <div className="text-sm space-y-0.5">
              <p>
                <span className="font-medium text-amber-700">Half Day:</span>{" "}
                {breakdown.half_day.days} day{breakdown.half_day.days !== 1 ? "s" : ""} ({breakdown.half_day.count} time{breakdown.half_day.count !== 1 ? "s" : ""})
              </p>
              <p className="text-xs text-muted-foreground pl-3">
                Reasons: {breakdown.half_day.reasons.join(", ")}
              </p>
            </div>
          )}

          {fyLeaves.length === 0 && (
            <p className="text-sm text-muted-foreground italic">No leaves taken this financial year.</p>
          )}
        </div>

        <Separator className="bg-gray-100" />

        {/* ── Unplanned / Last-minute ── */}
        <div className="space-y-1.5">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Planning Pattern</h4>

          {totalLeaves > 0 ? (
            <div className="text-sm space-y-1">
              <p>
                <span className="font-medium">Unplanned leaves:</span>{" "}
                {unplannedLeaves.length} of {totalLeaves}
                <span className={`ml-1.5 text-xs font-medium ${
                  unplannedPct > 50 ? "text-red-600" : unplannedPct > 25 ? "text-amber-600" : "text-green-600"
                }`}>
                  ({unplannedPct}%)
                </span>
              </p>
              {lastMinuteLeaves.length > 0 && (
                <p className="text-xs text-red-600">
                  {lastMinuteLeaves.length} leave{lastMinuteLeaves.length !== 1 ? "s" : ""} applied on the same day
                  {lastMinuteLeaves.length > 0 && (
                    <span className="text-muted-foreground">
                      {" "}— {lastMinuteLeaves.map(l => `"${l.reason}"`).join(", ")}
                    </span>
                  )}
                </p>
              )}
              {unplannedLeaves.length > 0 && unplannedLeaves.length > lastMinuteLeaves.length && (
                <p className="text-xs text-amber-600">
                  {unplannedLeaves.length - lastMinuteLeaves.length} leave{unplannedLeaves.length - lastMinuteLeaves.length !== 1 ? "s" : ""} applied just 1 day before
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground italic">No non-WFH leaves to analyze.</p>
          )}
        </div>

        <Separator className="bg-gray-100" />

        {/* ── Recent months ── */}
        <div className="space-y-1">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Last 3 Months</h4>
          <div className="text-sm text-muted-foreground">
            {monthlyPattern.map(m => (
              <span key={m.label} className="inline-block mr-3">
                <span className="font-medium text-gray-700">{m.label}:</span>{" "}
                {m.days > 0 ? `${m.days} day${m.days !== 1 ? "s" : ""} off` : "none"}
              </span>
            ))}
          </div>
        </div>

        <Separator className="bg-gray-100" />

        {/* ── AI Insights ── */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-violet-500" />
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Insights</h4>
          </div>
          <div className="space-y-1">
            {insights.map((ins, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                {ins.type === "warning" && <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />}
                {ins.type === "info" && <span className="h-3.5 w-3.5 shrink-0 mt-0.5 flex items-center justify-center text-amber-500 font-bold text-[10px]">i</span>}
                {ins.type === "positive" && <span className="h-3.5 w-3.5 shrink-0 mt-0.5 flex items-center justify-center text-green-500 font-bold text-[10px]">&#10003;</span>}
                <span className={
                  ins.type === "warning" ? "text-red-700" :
                  ins.type === "positive" ? "text-green-700" : "text-gray-600"
                }>
                  {ins.text}
                </span>
              </div>
            ))}
            {insights.length === 0 && (
              <p className="text-xs text-muted-foreground italic">Not enough data for insights.</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
