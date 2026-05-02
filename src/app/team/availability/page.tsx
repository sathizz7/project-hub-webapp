"use client";

import { useState } from "react";
import Link from "next/link";
import { LeaveAnalytics } from "@/components/leave-analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  ArrowLeft,
  CalendarDays,
  Plus,
  ShieldCheck,
  ShieldX,
  Clock,
  AlertTriangle,
  ArrowRightLeft,
  Users,
  Eye,
  Plane,
  Thermometer,
  Home,
  UserCheck,
  Send,
  Target,
  ListTodo,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Hourglass,
  Zap,
  Link2,
  CircleDot,
} from "lucide-react";
import {
  USERS,
  PROJECTS,
  getUser,
  getUserProjects,
  type User,
  type LeaveRequest,
  type LeaveImpact,
} from "@/lib/mock-data";
import { format } from "date-fns";

// ─── Helpers ───────────────────────────────────────────────

function Avatar({ userId, size = "sm" }: { userId: string; size?: "sm" | "md" | "lg" }) {
  const user = getUser(userId);
  if (!user) return null;
  const dim = size === "sm" ? "h-7 w-7 text-[10px]" : size === "md" ? "h-9 w-9 text-xs" : "h-11 w-11 text-sm";
  return (
    <div
      className={`${dim} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: user.avatarColor }}
      title={`${user.name} — ${user.role}`}
    >
      {user.name.charAt(0)}
    </div>
  );
}

function formatDate(d: string) {
  return format(new Date(d), "MMM d, yyyy");
}

function formatShortDate(d: string) {
  return format(new Date(d), "MMM d");
}

const leaveTypeLabels: Record<string, string> = {
  planned: "Planned Leave",
  sick: "Sick Leave",
  personal: "Personal",
  wfh: "Work from Home",
  half_day: "Half Day",
};

const leaveTypeColors: Record<string, string> = {
  planned: "text-blue-700 border-blue-200 bg-blue-50",
  sick: "text-red-700 border-red-200 bg-red-50",
  personal: "text-purple-700 border-purple-200 bg-purple-50",
  wfh: "text-teal-700 border-teal-200 bg-teal-50",
  half_day: "text-amber-700 border-amber-200 bg-amber-50",
};

const leaveTypeIcons: Record<string, React.ReactNode> = {
  planned: <Plane className="h-3.5 w-3.5" />,
  sick: <Thermometer className="h-3.5 w-3.5" />,
  personal: <CalendarDays className="h-3.5 w-3.5" />,
  wfh: <Home className="h-3.5 w-3.5" />,
  half_day: <Clock className="h-3.5 w-3.5" />,
};

const statusColors: Record<string, string> = {
  pending: "text-amber-700 border-amber-200 bg-amber-50",
  approved: "text-emerald-700 border-emerald-200 bg-emerald-50",
  rejected: "text-red-700 border-red-200 bg-red-50",
};

// ─── Simulate leave data import ───────────────────────────
// We import from mock-data. If the types aren't available yet (background agent),
// we provide a fallback.
let LEAVE_REQUESTS: LeaveRequest[] = [];
try {
  const mockData = require("@/lib/mock-data");
  LEAVE_REQUESTS = mockData.LEAVE_REQUESTS || [];
} catch {
  LEAVE_REQUESTS = [];
}

// ─── Page ─────────────────────────────────────────────────

export default function LeaveAvailabilityPage() {
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [expandedLeave, setExpandedLeave] = useState<Set<string>>(new Set());
  const [newLeaveType, setNewLeaveType] = useState<string>("planned");
  const [newStartDate, setNewStartDate] = useState("");
  const [newEndDate, setNewEndDate] = useState("");
  const [newReason, setNewReason] = useState("");
  const [newCoverage, setNewCoverage] = useState("");
  const [newContingency, setNewContingency] = useState("");
  const [newCoverPerson, setNewCoverPerson] = useState("");
  const [ceoComment, setCeoComment] = useState("");
  const [analyticsUserId, setAnalyticsUserId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedLeave(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const pendingLeaves = LEAVE_REQUESTS.filter(lr => lr.status === "pending");
  const approvedLeaves = LEAVE_REQUESTS.filter(lr => lr.status === "approved");
  const leavesWithImpact = LEAVE_REQUESTS.filter(lr => lr.impacts.length > 0);
  const upcomingLeaves = LEAVE_REQUESTS.filter(lr => {
    const start = new Date(lr.startDate).getTime();
    return start >= Date.now() && (lr.status === "approved" || lr.status === "pending");
  });

  // Build a 14-day availability calendar
  const calendarDays: { date: Date; dayLabel: string; users: { userId: string; status: string; leaveType?: string }[] }[] = [];
  for (let i = 0; i < 14; i++) {
    const date = new Date(Date.now() + i * 86400000);
    const dayLabel = format(date, "EEE d");
    const users = USERS.filter(u => u.id !== "u1").map(u => {
      const leave = LEAVE_REQUESTS.find(lr => {
        const start = new Date(lr.startDate).getTime();
        const end = new Date(lr.endDate).getTime();
        return lr.userId === u.id && date.getTime() >= start - 86400000 && date.getTime() <= end + 86400000 && lr.status !== "rejected";
      });
      if (leave) {
        return { userId: u.id, status: leave.type === "wfh" ? "wfh" : leave.type === "half_day" ? "half_day" : "on_leave", leaveType: leave.type };
      }
      return { userId: u.id, status: "available" };
    });
    calendarDays.push({ date, dayLabel, users });
  }

  const availabilityColors: Record<string, string> = {
    available: "bg-emerald-500",
    on_leave: "bg-red-500",
    wfh: "bg-teal-500",
    half_day: "bg-amber-500",
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4 flex-wrap">
        <Link href="/team" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-blue-500" /> Leave & Availability
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage team leaves, see impact on projects, and plan contingencies
          </p>
        </div>
        <Button
          className="gap-1.5"
          onClick={() => setShowRequestForm(!showRequestForm)}
        >
          <Plus className="h-4 w-4" /> Request Leave
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Hourglass className="h-4 w-4 text-amber-600" />
            <span className="text-xs text-muted-foreground">Pending Approval</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${pendingLeaves.length > 0 ? "text-amber-600" : ""}`}>{pendingLeaves.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Plane className="h-4 w-4 text-blue-600" />
            <span className="text-xs text-muted-foreground">Upcoming Leaves</span>
          </div>
          <p className="text-2xl font-bold mt-1">{upcomingLeaves.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <span className="text-xs text-muted-foreground">With Project Impact</span>
          </div>
          <p className={`text-2xl font-bold mt-1 ${leavesWithImpact.length > 0 ? "text-red-600" : ""}`}>{leavesWithImpact.length}</p>
        </Card>
        <Card className="p-3">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            <span className="text-xs text-muted-foreground">Available Today</span>
          </div>
          <p className="text-2xl font-bold mt-1">
            {USERS.filter(u => u.id !== "u1").length - LEAVE_REQUESTS.filter(lr => {
              const today = new Date();
              const start = new Date(lr.startDate);
              const end = new Date(lr.endDate);
              return today >= start && today <= end && lr.status === "approved" && lr.type !== "wfh";
            }).length}
            <span className="text-sm text-muted-foreground font-normal">/{USERS.filter(u => u.id !== "u1").length}</span>
          </p>
        </Card>
      </div>

      {/* 14-Day Availability Calendar */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-blue-600" /> Team Availability — Next 14 Days
          </CardTitle>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-1">
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500 inline-block" /> Available</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-red-500 inline-block" /> On Leave</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-teal-500 inline-block" /> WFH</span>
            <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-sm bg-amber-500 inline-block" /> Half Day</span>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="overflow-x-auto">
            <div className="min-w-[700px]">
              {/* Header row */}
              <div className="grid gap-0.5" style={{ gridTemplateColumns: `100px repeat(14, 1fr)` }}>
                <div className="text-[10px] text-muted-foreground p-1" />
                {calendarDays.map((day, i) => {
                  const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                  return (
                    <div key={i} className={`text-[10px] text-center p-1 ${isWeekend ? "text-muted-foreground/50" : "text-muted-foreground"}`}>
                      {day.dayLabel}
                    </div>
                  );
                })}
              </div>
              {/* User rows */}
              {USERS.filter(u => u.id !== "u1").map(user => (
                <div key={user.id} className="grid gap-0.5" style={{ gridTemplateColumns: `100px repeat(14, 1fr)` }}>
                  <div className="flex items-center gap-1.5 p-1">
                    <Avatar userId={user.id} size="sm" />
                    <span className="text-xs truncate">{user.name}</span>
                  </div>
                  {calendarDays.map((day, i) => {
                    const userDay = day.users.find(u => u.userId === user.id);
                    const isWeekend = day.date.getDay() === 0 || day.date.getDay() === 6;
                    const status = isWeekend ? "weekend" : (userDay?.status || "available");
                    const bgColor = isWeekend
                      ? "bg-muted/20"
                      : availabilityColors[status] || "bg-emerald-500";
                    return (
                      <div
                        key={i}
                        className={`h-8 rounded-sm ${isWeekend ? bgColor : `${bgColor}/30 hover:${bgColor}/50`} cursor-default transition-colors flex items-center justify-center`}
                        title={`${user.name} — ${isWeekend ? "Weekend" : status.replace("_", " ")}`}
                      >
                        {status === "on_leave" && <Plane className="h-3 w-3 text-red-600" />}
                        {status === "wfh" && <Home className="h-3 w-3 text-teal-600" />}
                        {status === "half_day" && <Clock className="h-3 w-3 text-amber-600" />}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Leave Request Form */}
      {showRequestForm && (
        <Card className="border-blue-200">
          <CardContent className="p-4 space-y-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Plus className="h-4 w-4 text-blue-600" /> New Leave Request
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Leave Type</Label>
                <Select value={newLeaveType} onValueChange={(v) => v && setNewLeaveType(v)}>
                  <SelectTrigger className="h-8 text-xs mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="planned">Planned Leave</SelectItem>
                    <SelectItem value="sick">Sick Leave</SelectItem>
                    <SelectItem value="personal">Personal</SelectItem>
                    <SelectItem value="wfh">Work from Home</SelectItem>
                    <SelectItem value="half_day">Half Day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Start Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={newStartDate} onChange={e => setNewStartDate(e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">End Date</Label>
                <Input type="date" className="h-8 text-xs mt-1" value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
              </div>
            </div>

            <div>
              <Label className="text-xs">Reason</Label>
              <Input className="h-8 text-xs mt-1" placeholder="Why do you need this leave?" value={newReason} onChange={e => setNewReason(e.target.value)} />
            </div>

            {/* Impact Preview (simulated) */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <h5 className="text-[10px] font-semibold uppercase tracking-wider text-amber-600 mb-2 flex items-center gap-1">
                <Zap className="h-3 w-3" /> Auto Impact Analysis (AI-Powered)
              </h5>
              <div className="space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-1.5">
                  <CircleDot className="h-3 w-3 text-amber-600" />
                  <span>Checking your active tasks and milestones...</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Link2 className="h-3 w-3 text-amber-600" />
                  <span>Analyzing dependency chains for downstream impact...</span>
                </p>
                <p className="flex items-center gap-1.5">
                  <Users className="h-3 w-3 text-amber-600" />
                  <span>Checking team availability for coverage...</span>
                </p>
                <p className="text-[10px] italic mt-2 text-muted-foreground/70">Select dates to see real impact (prototype — shows simulated analysis)</p>
              </div>
            </div>

            <div>
              <Label className="text-xs">Coverage Plan <span className="text-muted-foreground">(Who will handle your work?)</span></Label>
              <Textarea className="text-xs min-h-[50px] mt-1" placeholder="Describe who will cover your tasks and how..." value={newCoverage} onChange={e => setNewCoverage(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs">Contingency Note <span className="text-muted-foreground">(What will you finish before leaving?)</span></Label>
              <Textarea className="text-xs min-h-[50px] mt-1" placeholder="What will you complete before your leave? Any prep work?" value={newContingency} onChange={e => setNewContingency(e.target.value)} />
            </div>

            <div>
              <Label className="text-xs">Cover Person</Label>
              <Select value={newCoverPerson} onValueChange={(v) => v && setNewCoverPerson(v)}>
                <SelectTrigger className="h-8 text-xs mt-1 w-[200px]">
                  <SelectValue placeholder="Select teammate..." />
                </SelectTrigger>
                <SelectContent>
                  {USERS.filter(u => u.id !== "u1").map(u => (
                    <SelectItem key={u.id} value={u.id}>{u.name} — {u.role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1"
                onClick={() => {
                  alert(`Leave request submitted for CEO approval!\nType: ${newLeaveType}\nDates: ${newStartDate} to ${newEndDate}\nReason: ${newReason}\nCoverage: ${newCoverage}\n(Prototype — no backend)`);
                  setShowRequestForm(false);
                  setNewReason("");
                  setNewCoverage("");
                  setNewContingency("");
                  setNewStartDate("");
                  setNewEndDate("");
                }}
              >
                <Send className="h-3.5 w-3.5" /> Submit for Approval
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowRequestForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pending Leave Requests — CEO Action Needed */}
      {pendingLeaves.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-amber-600 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" /> Action Required — Pending Leave Requests
          </h3>
          {pendingLeaves.map(lr => {
            const user = getUser(lr.userId);
            const coverPerson = lr.coverPersonId ? getUser(lr.coverPersonId) : null;
            const isExpanded = expandedLeave.has(lr.id);

            return (
              <Card key={lr.id} className={`border-amber-200 ${lr.impacts.length > 0 ? "ring-1 ring-amber-200" : ""}`}>
                <CardContent className="p-4 space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      {user && <Avatar userId={lr.userId} size="md" />}
                      <div>
                        <p className="text-sm font-medium">{user?.name}</p>
                        <p className="text-[10px] text-muted-foreground">{user?.role}</p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] ${leaveTypeColors[lr.type]}`}>
                        {leaveTypeIcons[lr.type]} <span className="ml-1">{leaveTypeLabels[lr.type]}</span>
                      </Badge>
                      <Badge variant="outline" className={`text-[10px] ${statusColors[lr.status]}`}>
                        Pending
                      </Badge>
                      {lr.impacts.length > 0 && (
                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">
                          <AlertTriangle className="h-3 w-3 mr-1" /> {lr.impacts.length} task{lr.impacts.length > 1 ? "s" : ""} impacted
                        </Badge>
                      )}
                      <button
                        onClick={() => setAnalyticsUserId(analyticsUserId === lr.userId ? null : lr.userId)}
                        className={`ml-1 p-1 rounded-md transition-colors ${
                          analyticsUserId === lr.userId
                            ? "bg-violet-100 text-violet-600"
                            : "text-gray-400 hover:bg-violet-50 hover:text-violet-500"
                        }`}
                        title={`View leave analytics for ${user?.name}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{formatDate(lr.createdAt)}</span>
                  </div>

                  {/* Dates & Reason */}
                  <div className="flex items-center gap-4 text-xs flex-wrap">
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="h-3.5 w-3.5 text-blue-600" />
                      <span className="font-medium">{formatShortDate(lr.startDate)} — {formatShortDate(lr.endDate)}</span>
                      <span className="text-muted-foreground">({lr.days} day{lr.days !== 1 ? "s" : ""})</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">{lr.reason}</p>

                  {/* Coverage & Contingency */}
                  {(lr.coveragePlan || lr.contingencyNote) && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {lr.contingencyNote && (
                        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
                          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1">
                            <ShieldCheck className="h-3 w-3" /> Before Leaving
                          </h5>
                          <p className="text-xs text-muted-foreground">{lr.contingencyNote}</p>
                        </div>
                      )}
                      {lr.coveragePlan && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
                          <h5 className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 mb-1 flex items-center gap-1">
                            <UserCheck className="h-3 w-3" /> Coverage Plan
                            {coverPerson && <span className="normal-case font-normal"> — {coverPerson.name}</span>}
                          </h5>
                          <p className="text-xs text-muted-foreground">{lr.coveragePlan}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Impact Analysis */}
                  {lr.impacts.length > 0 && (
                    <div className="space-y-2">
                      <button
                        className="text-xs font-semibold text-amber-600 flex items-center gap-1 hover:text-amber-300"
                        onClick={() => toggleExpand(lr.id)}
                      >
                        <Zap className="h-3.5 w-3.5" /> Impact Analysis ({lr.impacts.length} task{lr.impacts.length > 1 ? "s" : ""})
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>

                      {isExpanded && (
                        <div className="space-y-2">
                          {lr.impacts.map((impact, idx) => (
                            <div key={idx} className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
                              <div className="flex items-center gap-2 flex-wrap text-xs">
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Target className="h-3 w-3" /> {impact.projectTitle}
                                </span>
                                <span className="text-muted-foreground/50">/</span>
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <ListTodo className="h-3 w-3" /> {impact.taskTitle}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-red-600 font-medium">+{impact.impactDays} day{impact.impactDays > 1 ? "s" : ""} delay</span>
                                <span className="text-muted-foreground">Milestone: {impact.milestoneTitle}</span>
                              </div>

                              {/* Cascade effects */}
                              {impact.cascadeEffects.length > 0 && (
                                <div className="mt-1.5 pl-3 border-l-2 border-red-200 space-y-1.5">
                                  <p className="text-[10px] font-semibold uppercase tracking-wider text-red-600">Cascade Effects</p>
                                  {impact.cascadeEffects.map((cascade, ci) => {
                                    const affected = getUser(cascade.affectedUserId);
                                    return (
                                      <div key={ci} className="flex items-center gap-2 text-xs text-muted-foreground">
                                        {affected && <Avatar userId={cascade.affectedUserId} size="sm" />}
                                        <span>{affected?.name}</span>
                                        <span className="text-muted-foreground/50">—</span>
                                        <span>{cascade.affectedTaskTitle}</span>
                                        <Badge variant="outline" className="text-[10px] text-red-600 border-red-200 bg-red-50">
                                          +{cascade.delayDays}d
                                        </Badge>
                                      </div>
                                    );
                                  })}
                                  {impact.cascadeEffects.map((cascade, ci) => (
                                    <p key={`reason-${ci}`} className="text-[10px] text-muted-foreground italic">
                                      {cascade.reason}
                                    </p>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Leave Analytics Panel */}
                  {analyticsUserId === lr.userId && (
                    <LeaveAnalytics userId={lr.userId} onClose={() => setAnalyticsUserId(null)} />
                  )}

                  {/* CEO Action */}
                  <Separator />
                  <div className="space-y-2">
                    <h5 className="text-xs font-semibold flex items-center gap-1.5">
                      <UserCheck className="h-3.5 w-3.5 text-blue-600" /> CEO Decision
                    </h5>
                    <Textarea
                      placeholder="Add comment (optional)..."
                      className="text-xs min-h-[50px]"
                      value={ceoComment}
                      onChange={e => setCeoComment(e.target.value)}
                    />
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        size="sm"
                        className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                        onClick={() => {
                          alert(`Leave request ${lr.id} APPROVED for ${user?.name}. Comment: "${ceoComment}" (Prototype)`);
                          setCeoComment("");
                        }}
                      >
                        <ShieldCheck className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 gap-1"
                        onClick={() => {
                          alert(`Leave request ${lr.id} REJECTED for ${user?.name}. Comment: "${ceoComment}" (Prototype)`);
                          setCeoComment("");
                        }}
                      >
                        <ShieldX className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-muted-foreground gap-1"
                        onClick={() => alert("This would open a discussion with the team member. (Prototype)")}
                      >
                        <MessageCircle className="h-3.5 w-3.5" /> Discuss
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Approved & Past Leaves */}
      {approvedLeaves.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600" /> Approved Leaves
          </h3>
          {approvedLeaves
            .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
            .map(lr => {
              const user = getUser(lr.userId);
              const coverPerson = lr.coverPersonId ? getUser(lr.coverPersonId) : null;
              const isPast = new Date(lr.endDate).getTime() < Date.now();

              return (
                <Card key={lr.id} className={`${isPast ? "opacity-60" : ""} border-emerald-200`}>
                  <CardContent className="p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {user && <Avatar userId={lr.userId} size="sm" />}
                      <span className="text-sm font-medium">{user?.name}</span>
                      <Badge variant="outline" className={`text-[10px] ${leaveTypeColors[lr.type]}`}>
                        {leaveTypeLabels[lr.type]}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {formatShortDate(lr.startDate)}{lr.days > 1 ? ` — ${formatShortDate(lr.endDate)}` : ""} ({lr.days}d)
                      </span>
                      {coverPerson && (
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1 ml-auto">
                          <UserCheck className="h-3 w-3" /> Cover: {coverPerson.name}
                        </span>
                      )}
                      {lr.impacts.length > 0 && (
                        <Badge variant="outline" className="text-[10px] text-amber-600 border-amber-200 bg-amber-50">
                          {lr.impacts.length} impact{lr.impacts.length > 1 ? "s" : ""}
                        </Badge>
                      )}
                      {isPast && (
                        <Badge variant="outline" className="text-[10px] text-muted-foreground border-border">
                          Past
                        </Badge>
                      )}
                      <button
                        onClick={() => setAnalyticsUserId(analyticsUserId === lr.userId ? null : lr.userId)}
                        className={`p-1 rounded-md transition-colors ${
                          analyticsUserId === lr.userId
                            ? "bg-violet-100 text-violet-600"
                            : "text-gray-400 hover:bg-violet-50 hover:text-violet-500"
                        }`}
                        title={`View leave analytics for ${user?.name}`}
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5 ml-9">{lr.reason}</p>
                    {lr.contingencyNote && (
                      <p className="text-[10px] text-emerald-600/80 mt-1 ml-9">
                        <ShieldCheck className="h-3 w-3 inline mr-1" />{lr.contingencyNote}
                      </p>
                    )}
                    {analyticsUserId === lr.userId && (
                      <div className="mt-2">
                        <LeaveAnalytics userId={lr.userId} onClose={() => setAnalyticsUserId(null)} />
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
        </div>
      )}

      {/* No leaves state */}
      {LEAVE_REQUESTS.length === 0 && (
        <Card className="p-8 text-center">
          <CalendarDays className="h-10 w-10 text-muted-foreground mx-auto mb-3 opacity-50" />
          <p className="text-sm text-muted-foreground">
            No leave requests yet. Team is fully available!
          </p>
        </Card>
      )}
    </div>
  );
}
