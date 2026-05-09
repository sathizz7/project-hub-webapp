import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  groupByDate,
  matchesTypeFilter,
  filterProjects,
  sortProjects,
} from "@/lib/review-and-projects-helpers";

const FIXED_NOW = new Date("2026-05-10T12:00:00.000Z");
beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(FIXED_NOW); });
afterEach(() => { vi.useRealTimers(); });

describe("groupByDate", () => {
  it("puts today's items in Today", () => {
    const items = [{ createdAt: "2026-05-10T08:00:00.000Z", id: "1" }];
    const result = groupByDate(items);
    expect(result.Today).toHaveLength(1);
    expect(result.Yesterday).toHaveLength(0);
    expect(result.Earlier).toHaveLength(0);
  });
  it("puts yesterday's items in Yesterday", () => {
    const items = [{ createdAt: "2026-05-09T20:00:00.000Z", id: "2" }];
    const result = groupByDate(items);
    expect(result.Yesterday).toHaveLength(1);
  });
  it("puts older items in Earlier", () => {
    const items = [{ createdAt: "2026-05-01T10:00:00.000Z", id: "3" }];
    const result = groupByDate(items);
    expect(result.Earlier).toHaveLength(1);
  });
  it("handles empty array", () => {
    const result = groupByDate([]);
    expect(result.Today).toHaveLength(0);
    expect(result.Yesterday).toHaveLength(0);
    expect(result.Earlier).toHaveLength(0);
  });
  it("distributes mixed items correctly", () => {
    const items = [
      { createdAt: "2026-05-10T08:00:00.000Z", id: "t" },
      { createdAt: "2026-05-09T10:00:00.000Z", id: "y" },
      { createdAt: "2026-05-05T10:00:00.000Z", id: "e" },
    ];
    const result = groupByDate(items);
    expect(result.Today).toHaveLength(1);
    expect(result.Yesterday).toHaveLength(1);
    expect(result.Earlier).toHaveLength(1);
  });
});

describe("matchesTypeFilter", () => {
  it("'all' matches any type", () => {
    expect(matchesTypeFilter("code", "all")).toBe(true);
    expect(matchesTypeFilter("document", "all")).toBe(true);
    expect(matchesTypeFilter("demo", "all")).toBe(true);
  });
  it("'code' matches only code", () => {
    expect(matchesTypeFilter("code", "code")).toBe(true);
    expect(matchesTypeFilter("document", "code")).toBe(false);
  });
  it("'docs' matches document and architecture", () => {
    expect(matchesTypeFilter("document", "docs")).toBe(true);
    expect(matchesTypeFilter("architecture", "docs")).toBe(true);
    expect(matchesTypeFilter("code", "docs")).toBe(false);
  });
  it("'demos' matches demo and notebook", () => {
    expect(matchesTypeFilter("demo", "demos")).toBe(true);
    expect(matchesTypeFilter("notebook", "demos")).toBe(true);
    expect(matchesTypeFilter("document", "demos")).toBe(false);
  });
});

const projects = [
  { id: "1", type: "engineering", status: "active",    priority: "high",   daysRemaining: 5,  progress: 30,  startDate: "2026-05-01T00:00:00.000Z" },
  { id: "2", type: "research",    status: "active",    priority: "medium", daysRemaining: 12, progress: 60,  startDate: "2026-05-03T00:00:00.000Z" },
  { id: "3", type: "engineering", status: "completed", priority: "low",    daysRemaining: -5, progress: 100, startDate: "2026-04-01T00:00:00.000Z" },
];

describe("filterProjects", () => {
  it("returns all when type=all and status=all", () => {
    expect(filterProjects(projects, { type: "all", status: "all" })).toHaveLength(3);
  });
  it("filters by type", () => {
    const result = filterProjects(projects, { type: "engineering", status: "all" });
    expect(result).toHaveLength(2);
    expect(result.every(p => p.type === "engineering")).toBe(true);
  });
  it("filters by status", () => {
    const result = filterProjects(projects, { type: "all", status: "active" });
    expect(result).toHaveLength(2);
    expect(result.every(p => p.status === "active")).toBe(true);
  });
  it("filters by both type and status", () => {
    const result = filterProjects(projects, { type: "engineering", status: "active" });
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("1");
  });
});

describe("sortProjects", () => {
  it("sorts by priority descending (critical > high > medium > low)", () => {
    const items = [
      { ...projects[0], priority: "low" },
      { ...projects[1], priority: "critical" },
      { ...projects[2], priority: "medium" },
    ];
    const sorted = sortProjects(items, "priority");
    expect(sorted[0].priority).toBe("critical");
    expect(sorted[sorted.length - 1].priority).toBe("low");
  });
  it("sorts by deadline (soonest first)", () => {
    const sorted = sortProjects(projects, "deadline");
    expect(sorted[0].daysRemaining).toBeLessThanOrEqual(sorted[1].daysRemaining);
  });
  it("sorts by progress ascending (least complete first)", () => {
    const sorted = sortProjects(projects, "progress");
    expect(sorted[0].progress).toBeLessThanOrEqual(sorted[1].progress);
  });
  it("sorts by recent (newest startDate first) as default", () => {
    const sorted = sortProjects(projects, "recent");
    expect(new Date(sorted[0].startDate).getTime()).toBeGreaterThanOrEqual(
      new Date(sorted[1].startDate).getTime()
    );
  });
  it("does not mutate the input array", () => {
    const copy = [...projects];
    sortProjects(projects, "priority");
    expect(projects[0].id).toBe(copy[0].id);
  });
});
