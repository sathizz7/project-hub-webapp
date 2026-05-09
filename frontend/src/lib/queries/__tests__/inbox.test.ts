import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/__tests__/_helpers/test-db";
import { getActionInbox } from "@/lib/queries/inbox";

type TestPrisma = Awaited<ReturnType<typeof createTestDb>>["prisma"];

let prisma: TestPrisma;
let cleanup: () => Promise<void>;

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000);

async function seed(p: TestPrisma) {
  const ceo = await p.user.create({ data: { name: "Rahul", email: "ceo@test.com", role: "CEO", roleType: "ceo" } });
  const eng = await p.user.create({ data: { name: "Alice", email: "alice@test.com", role: "Engineer" } });
  const project = await p.project.create({ data: { title: "Test Project", type: "engineering", requirement: "Build" } });
  const phase = await p.phase.create({ data: { projectId: project.id, phaseName: "Dev", order: 0 } });

  // A pending submission (review kind)
  const sub = await p.submission.create({ data: { phaseId: phase.id, projectId: project.id, userId: eng.id, title: "Architecture Doc", type: "document", description: "Initial architecture", createdAt: d(-3) } });

  // A pending capture item (capture kind)
  const session = await p.captureSession.create({ data: { userId: ceo.id, rawInput: "Quick notes", createdAt: d(-1) } });
  await p.captureItem.create({ data: { sessionId: session.id, type: "todo", rawText: "raw", title: "Check deployment", priority: "high", status: "pending", createdAt: d(-1) } });

  // A pending extension (extension kind)
  const task = await p.task.create({ data: { title: "Core task", projectId: project.id, assigneeId: eng.id, priority: "high", status: "in_progress" } });
  await p.deadlineExtension.create({ data: { projectId: project.id, taskId: task.id, requestedById: eng.id, originalDeadline: d(-2), requestedDeadline: d(3), reason: "task_complexity", status: "pending", createdAt: d(-2) } });

  return { ceo, eng, project, sub };
}

beforeEach(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  cleanup = db.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe("getActionInbox", () => {
  it("returns items of all three kinds", async () => {
    const { ceo } = await seed(prisma);
    const inbox = await getActionInbox(ceo.id, prisma);
    const kinds = inbox.map((i) => i.kind);
    expect(kinds).toContain("review");
    expect(kinds).toContain("capture");
    expect(kinds).toContain("extension");
  });

  it("returns items sorted by urgencyScore DESC", async () => {
    const { ceo } = await seed(prisma);
    const inbox = await getActionInbox(ceo.id, prisma);
    for (let i = 1; i < inbox.length; i++) {
      expect(inbox[i - 1].urgencyScore).toBeGreaterThanOrEqual(inbox[i].urgencyScore);
    }
  });

  it("returns empty when no pending items", async () => {
    const ceo = await prisma.user.create({ data: { name: "Empty CEO", email: "empty@test.com", role: "CEO", roleType: "ceo" } });
    const inbox = await getActionInbox(ceo.id, prisma);
    expect(inbox).toHaveLength(0);
  });
});
