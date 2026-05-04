import { describe, it, expect } from "vitest";
import { deriveDepartment, filterMembers, sortMembers, buildWeekStrip } from "@/lib/team-helpers";

describe("deriveDepartment", () => {
  it("returns Engineering for Full-Stack Engineer", () => { expect(deriveDepartment("Full-Stack Engineer")).toBe("Engineering"); });
  it("returns Engineering for Backend Engineer", () => { expect(deriveDepartment("Backend Engineer")).toBe("Engineering"); });
  it("returns Engineering for DevOps Engineer", () => { expect(deriveDepartment("DevOps Engineer")).toBe("Engineering"); });
  it("returns Data Science for Senior Data Scientist", () => { expect(deriveDepartment("Senior Data Scientist")).toBe("Data Science"); });
  it("returns Data Science for ML Engineer", () => { expect(deriveDepartment("ML Engineer")).toBe("Data Science"); });
  it("returns Design for UX Designer", () => { expect(deriveDepartment("UX Designer")).toBe("Design"); });
  it("returns Product for Product Manager", () => { expect(deriveDepartment("Product Manager")).toBe("Product"); });
  it("returns Leadership for CEO", () => { expect(deriveDepartment("CEO")).toBe("Leadership"); });
  it("returns Other for unknown roles", () => { expect(deriveDepartment("Accountant")).toBe("Other"); });
});

const members = [
  { id: "1", name: "Alice", role: "Full-Stack Engineer",    department: "Engineering",  performance: { score: 80, avgResponseHours: 4, submissionsCount: 5 }, activeProjectCount: 2, email: "a@x", avatarColor: "#000" },
  { id: "2", name: "Bob",   role: "Senior Data Scientist",  department: "Data Science", performance: { score: 90, avgResponseHours: 2, submissionsCount: 8 }, activeProjectCount: 3, email: "b@x", avatarColor: "#111" },
  { id: "3", name: "Carol", role: "UX Designer",            department: "Design",       performance: { score: 70, avgResponseHours: 6, submissionsCount: 3 }, activeProjectCount: 1, email: "c@x", avatarColor: "#222" },
];

describe("filterMembers", () => {
  it("returns all when department is 'all'", () => { expect(filterMembers(members, "all")).toHaveLength(3); });
  it("filters to a specific department", () => {
    const result = filterMembers(members, "Engineering");
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Alice");
  });
  it("returns empty array when no match", () => { expect(filterMembers(members, "Product")).toHaveLength(0); });
});

describe("sortMembers", () => {
  it("sorts by name ascending", () => {
    const sorted = sortMembers(members, "name");
    expect(sorted[0].name).toBe("Alice");
    expect(sorted[1].name).toBe("Bob");
    expect(sorted[2].name).toBe("Carol");
  });
  it("sorts by performance score descending (highest first)", () => {
    const sorted = sortMembers(members, "score");
    expect(sorted[0].performance.score).toBe(90);
    expect(sorted[sorted.length - 1].performance.score).toBe(70);
  });
  it("sorts by avg response time ascending (fastest first)", () => {
    const sorted = sortMembers(members, "response");
    expect(sorted[0].performance.avgResponseHours).toBe(2);
  });
  it("does not mutate the input array", () => {
    const copy = [...members];
    sortMembers(members, "score");
    expect(members[0].id).toBe(copy[0].id);
  });
});

describe("buildWeekStrip", () => {
  const today = new Date("2026-05-10T12:00:00.000Z");
  const leaves = [
    { startDate: "2026-05-10T00:00:00.000Z", endDate: "2026-05-11T00:00:00.000Z", user: { id: "u1", name: "Alice", avatarColor: "#000" } },
    { startDate: "2026-05-14T00:00:00.000Z", endDate: "2026-05-15T00:00:00.000Z", user: { id: "u2", name: "Bob",   avatarColor: "#111" } },
  ];

  it("returns 7 days", () => { expect(buildWeekStrip(today, leaves)).toHaveLength(7); });
  it("day 0 (today) includes Alice who is on leave", () => {
    const strip = buildWeekStrip(today, leaves);
    expect(strip[0].leavingUsers.map(u => u.name)).toContain("Alice");
  });
  it("day 0 does not include Bob (Bob leaves on day 4)", () => {
    const strip = buildWeekStrip(today, leaves);
    expect(strip[0].leavingUsers.map(u => u.name)).not.toContain("Bob");
  });
  it("day 4 includes Bob", () => {
    const strip = buildWeekStrip(today, leaves);
    expect(strip[4].leavingUsers.map(u => u.name)).toContain("Bob");
  });
  it("each day has a label string", () => {
    const strip = buildWeekStrip(today, leaves);
    expect(typeof strip[0].label).toBe("string");
    expect(strip[0].label.length).toBeGreaterThan(0);
  });
});
