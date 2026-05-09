import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/__tests__/_helpers/test-db";
import { computePerformanceMetrics } from "@/lib/queries/performance";

type TestPrisma = Awaited<ReturnType<typeof createTestDb>>["prisma"];

let prisma: TestPrisma;
let cleanup: () => Promise<void>;

const now = new Date();
const h = (offsetHours: number) => new Date(now.getTime() + offsetHours * 3600000);

async function seed(p: TestPrisma) {
  const member = await p.user.create({ data: { name: "Alice", email: "alice@test.com", role: "Eng" } });
  const ceo = await p.user.create({ data: { name: "Rahul", email: "ceo@test.com", role: "CEO", roleType: "ceo" } });
  const project = await p.project.create({ data: { title: "Test Project", type: "engineering", requirement: "Build" } });
  const phase = await p.phase.create({ data: { projectId: project.id, phaseName: "Dev", order: 0 } });

  // 4 submissions
  const subs = await Promise.all([
    p.submission.create({ data: { phaseId: phase.id, projectId: project.id, userId: member.id, title: "S1", type: "code", description: "", createdAt: h(-24) } }),
    p.submission.create({ data: { phaseId: phase.id, projectId: project.id, userId: member.id, title: "S2", type: "document", description: "", createdAt: h(-8) } }),
    p.submission.create({ data: { phaseId: phase.id, projectId: project.id, userId: member.id, title: "S3", type: "code", description: "", createdAt: h(-2) } }),
    p.submission.create({ data: { phaseId: phase.id, projectId: project.id, userId: member.id, title: "S4 (no feedback)", type: "code", description: "", createdAt: h(-1) } }),
  ]);

  // 3 feedbacks: 2h after S1, 8h after S2, 24h after S3
  await p.feedback.create({ data: { submissionId: subs[0].id, fromUserId: ceo.id, text: "Good", createdAt: h(-22) } }); // 2h turnaround
  await p.feedback.create({ data: { submissionId: subs[1].id, fromUserId: ceo.id, text: "Revise", createdAt: h(0) } }); // 8h turnaround
  await p.feedback.create({ data: { submissionId: subs[2].id, fromUserId: ceo.id, text: "Approved", createdAt: h(22) } }); // 24h turnaround

  return { member, ceo };
}

beforeEach(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  cleanup = db.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe("computePerformanceMetrics", () => {
  it("returns correct submissionsCount", async () => {
    const { member } = await seed(prisma);
    const metrics = await computePerformanceMetrics(member.id, prisma);
    expect(metrics.submissionsCount).toBe(4);
  });

  it("computes avgResponseHours from feedback turnarounds", async () => {
    const { member } = await seed(prisma);
    const metrics = await computePerformanceMetrics(member.id, prisma);
    // Average of 2, 8, 24 = 11.33... hours — allow small float tolerance
    expect(metrics.avgResponseHours).toBeCloseTo(11.33, 1);
  });

  it("returns a score between 0 and 100", async () => {
    const { member } = await seed(prisma);
    const metrics = await computePerformanceMetrics(member.id, prisma);
    expect(metrics.score).toBeGreaterThanOrEqual(0);
    expect(metrics.score).toBeLessThanOrEqual(100);
  });

  it("returns zero metrics for user with no submissions", async () => {
    const noSubUser = await prisma.user.create({ data: { name: "Empty", email: "empty@test.com", role: "Eng" } });
    const metrics = await computePerformanceMetrics(noSubUser.id, prisma);
    expect(metrics.submissionsCount).toBe(0);
    expect(metrics.avgResponseHours).toBe(0);
    expect(metrics.score).toBe(0);
  });
});
