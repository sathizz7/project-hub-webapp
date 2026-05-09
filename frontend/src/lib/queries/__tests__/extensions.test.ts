import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/__tests__/_helpers/test-db";
import { getPendingExtensions, getExtensionsForProject } from "@/lib/queries/extensions";

type TestPrisma = Awaited<ReturnType<typeof createTestDb>>["prisma"];

let prisma: TestPrisma;
let cleanup: () => Promise<void>;

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000);

async function seed(p: TestPrisma) {
  const user = await p.user.create({ data: { name: "Alice", email: "alice@test.com", role: "Eng" } });
  const p1 = await p.project.create({ data: { title: "Project Alpha", type: "engineering", requirement: "Build it" } });
  const p2 = await p.project.create({ data: { title: "Project Beta", type: "research", requirement: "Research it" } });
  const task = await p.task.create({ data: { title: "Core task", projectId: p1.id, assigneeId: user.id, priority: "high", status: "in_progress" } });

  const e1 = await p.deadlineExtension.create({ data: { projectId: p1.id, taskId: task.id, requestedById: user.id, originalDeadline: d(-2), requestedDeadline: d(3), reason: "task_complexity", status: "pending", escalationLevel: 0 } });
  const e2 = await p.deadlineExtension.create({ data: { projectId: p1.id, requestedById: user.id, originalDeadline: d(-5), requestedDeadline: d(1), reason: "dependency_blocked", status: "approved", escalationLevel: 0 } });
  const e3 = await p.deadlineExtension.create({ data: { projectId: p2.id, requestedById: user.id, originalDeadline: d(-10), requestedDeadline: d(-1), reason: "technical_challenge", status: "auto_escalated", escalationLevel: 2 } });

  return { user, p1, p2, task, e1, e2, e3 };
}

beforeEach(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  cleanup = db.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe("getPendingExtensions", () => {
  it("returns only pending extensions with requestedBy and task", async () => {
    await seed(prisma);
    const exts = await getPendingExtensions(prisma);
    expect(exts).toHaveLength(1);
    expect(exts[0].status).toBe("pending");
    expect(exts[0].requestedBy).toBeDefined();
    expect(exts[0].task).toBeDefined();
  });
});

describe("getExtensionsForProject", () => {
  it("returns all extensions for a given project", async () => {
    const { p1 } = await seed(prisma);
    const exts = await getExtensionsForProject(p1.id, prisma);
    expect(exts).toHaveLength(2);
  });

  it("returns empty for project with no extensions", async () => {
    const { p2 } = await seed(prisma);
    const project3 = await prisma.project.create({ data: { title: "Empty Project", type: "engineering", requirement: "Nothing" } });
    const exts = await getExtensionsForProject(project3.id, prisma);
    expect(exts).toHaveLength(0);
  });
});
