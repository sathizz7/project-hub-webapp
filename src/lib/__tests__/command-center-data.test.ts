import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  computeProjectProgress,
  computeDaysRemaining,
  computeKpis,
  generateHeuristicInsights,
} from "@/lib/command-center-data";

const FIXED_NOW = new Date("2026-05-03T08:00:00.000Z");

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW); });
afterEach(() => { vi.useRealTimers(); });

// ── computeProjectProgress ──────────────────────────────────────────────────
describe("computeProjectProgress", () => {
  it("returns 0 for empty phases", () => {
    expect(computeProjectProgress([])).toBe(0);
  });
  it("returns 0 when no phases completed", () => {
    expect(computeProjectProgress([{ status: "active" }, { status: "pending" }])).toBe(0);
  });
  it("returns 100 when all completed", () => {
    expect(computeProjectProgress([{ status: "completed" }, { status: "completed" }])).toBe(100);
  });
  it("returns 50 for half completed (rounds)", () => {
    expect(computeProjectProgress([{ status: "completed" }, { status: "completed" }, { status: "active" }, { status: "pending" }])).toBe(50);
  });
  it("rounds 1/3 to 33", () => {
    expect(computeProjectProgress([{ status: "completed" }, { status: "active" }, { status: "pending" }])).toBe(33);
  });
});

// ── computeDaysRemaining ────────────────────────────────────────────────────
describe("computeDaysRemaining", () => {
  it("returns 10 for a project starting today with 10-day timebox", () => {
    expect(computeDaysRemaining(FIXED_NOW, 10)).toBe(10);
  });
  it("returns 0 when project ends exactly today", () => {
    const start = new Date(FIXED_NOW.getTime() - 10 * 86_400_000);
    expect(computeDaysRemaining(start, 10)).toBe(0);
  });
  it("returns negative when overdue", () => {
    const start = new Date(FIXED_NOW.getTime() - 15 * 86_400_000);
    expect(computeDaysRemaining(start, 10)).toBe(-5);
  });
  it("uses ceiling: 1 hour remaining shows 1 day", () => {
    const start = new Date(FIXED_NOW.getTime() - 86_400_000 + 3_600_000);
    expect(computeDaysRemaining(start, 1)).toBe(1);
  });
});

// ── computeKpis ─────────────────────────────────────────────────────────────
describe("computeKpis", () => {
  it("returns correct values with no overdue tasks", () => {
    const k = computeKpis({ activeProjectCount: 12, pendingInboxCount: 7, completedProjectCount: 34, teamMemberCount: 8, overdueTaskCount: 0 });
    expect(k.active.value).toBe(12);
    expect(k.pendingReviews.value).toBe(7);
    expect(k.completed.value).toBe(34);
    expect(k.team.value).toBe(8);
    expect(k.pendingReviews.tone).toBe("default");
    expect(k.pendingReviews.delta).toBeUndefined();
  });
  it("sets danger tone and delta when overdueTaskCount > 0", () => {
    const k = computeKpis({ activeProjectCount: 5, pendingInboxCount: 3, completedProjectCount: 10, teamMemberCount: 6, overdueTaskCount: 4 });
    expect(k.pendingReviews.tone).toBe("danger");
    expect(k.pendingReviews.delta).toEqual({ value: "4 overdue", direction: "down" });
  });
  it("active KPI has no delta (no historical data yet)", () => {
    const k = computeKpis({ activeProjectCount: 5, pendingInboxCount: 0, completedProjectCount: 0, teamMemberCount: 4, overdueTaskCount: 0 });
    expect(k.active.delta).toBeUndefined();
  });
});

// ── generateHeuristicInsights ───────────────────────────────────────────────
const noExt: { escalationLevel: number; project: { title: string } }[] = [];

describe("generateHeuristicInsights", () => {
  it("includes suggestion rule when pendingInboxCount > 0", () => {
    const ins = generateHeuristicInsights({ overdueTaskCount: 0, pendingExtensions: noExt, upcomingLeaveCount: 0, activeProjectCount: 0, pendingInboxCount: 5 });
    expect(ins).toHaveLength(1);
    expect(ins[0].severity).toBe("suggestion");
    expect(ins[0].description).toContain("5 submissions");
  });
  it("singular form when pendingInboxCount is 1", () => {
    const ins = generateHeuristicInsights({ overdueTaskCount: 0, pendingExtensions: noExt, upcomingLeaveCount: 0, activeProjectCount: 0, pendingInboxCount: 1 });
    expect(ins[0].description).toContain("1 submission awaiting");
  });
  it("rule 1: risk insight for overdue tasks", () => {
    const ins = generateHeuristicInsights({ overdueTaskCount: 3, pendingExtensions: noExt, upcomingLeaveCount: 0, activeProjectCount: 2, pendingInboxCount: 1 });
    const risk = ins.find(i => i.severity === "risk" && i.title.includes("overdue"));
    expect(risk?.title).toBe("3 overdue tasks");
  });
  it("rule 1: singular for 1 overdue task", () => {
    const ins = generateHeuristicInsights({ overdueTaskCount: 1, pendingExtensions: noExt, upcomingLeaveCount: 0, activeProjectCount: 1, pendingInboxCount: 0 });
    expect(ins.find(i => i.title.includes("overdue"))?.title).toBe("1 overdue task");
  });
  it("rule 2: blocker for escalationLevel >= 2", () => {
    const exts = [{ escalationLevel: 1, project: { title: "Alpha" } }, { escalationLevel: 2, project: { title: "Beta" } }];
    const ins = generateHeuristicInsights({ overdueTaskCount: 0, pendingExtensions: exts, upcomingLeaveCount: 0, activeProjectCount: 2, pendingInboxCount: 3 });
    const blocker = ins.find(i => i.severity === "blocker");
    expect(blocker?.description).toContain("Beta");
  });
  it("rule 2: no blocker when escalationLevel < 2", () => {
    const ins = generateHeuristicInsights({ overdueTaskCount: 0, pendingExtensions: [{ escalationLevel: 1, project: { title: "X" } }], upcomingLeaveCount: 0, activeProjectCount: 1, pendingInboxCount: 1 });
    expect(ins.find(i => i.severity === "blocker")).toBeUndefined();
  });
  it("rule 3: risk for upcoming leaves with active projects", () => {
    const ins = generateHeuristicInsights({ overdueTaskCount: 0, pendingExtensions: noExt, upcomingLeaveCount: 2, activeProjectCount: 3, pendingInboxCount: 1 });
    const leaveRisk = ins.find(i => i.title.includes("leave"));
    expect(leaveRisk?.title).toBe("2 team members on leave this week");
  });
  it("rule 3: no leave-risk when activeProjectCount is 0", () => {
    const ins = generateHeuristicInsights({ overdueTaskCount: 0, pendingExtensions: noExt, upcomingLeaveCount: 3, activeProjectCount: 0, pendingInboxCount: 1 });
    expect(ins.find(i => i.title.includes("leave"))).toBeUndefined();
  });
  it("caps output at 4 items", () => {
    const exts = [{ escalationLevel: 3, project: { title: "Omega" } }];
    const ins = generateHeuristicInsights({ overdueTaskCount: 5, pendingExtensions: exts, upcomingLeaveCount: 2, activeProjectCount: 4, pendingInboxCount: 7 });
    expect(ins.length).toBeLessThanOrEqual(4);
  });
  it("all 4 rules fire and result is exactly 4 items", () => {
    const exts = [{ escalationLevel: 2, project: { title: "Gamma" } }];
    const ins = generateHeuristicInsights({ overdueTaskCount: 2, pendingExtensions: exts, upcomingLeaveCount: 1, activeProjectCount: 2, pendingInboxCount: 3 });
    expect(ins.length).toBe(4);
    expect(ins.map(i => i.severity)).toContain("risk");
    expect(ins.map(i => i.severity)).toContain("blocker");
    expect(ins.map(i => i.severity)).toContain("suggestion");
  });
});
