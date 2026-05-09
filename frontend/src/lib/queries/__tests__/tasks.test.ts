import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/__tests__/_helpers/test-db";
import { getTasksForUser, getTasksForProject, getOverdueTasks } from "@/lib/queries/tasks";

type TestPrisma = Awaited<ReturnType<typeof createTestDb>>["prisma"];

let prisma: TestPrisma;
let cleanup: () => Promise<void>;

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000);

async function seed(p: TestPrisma) {
  const user1 = await p.user.create({ data: { name: "Alice", email: "alice@test.com", role: "Engineer" } });
  const user2 = await p.user.create({ data: { name: "Bob", email: "bob@test.com", role: "Scientist" } });
  const project = await p.project.create({ data: { title: "Test Project", type: "engineering", requirement: "Build stuff" } });
  const phase = await p.phase.create({ data: { projectId: project.id, phaseName: "Dev", order: 0 } });

  const t1 = await p.task.create({ data: { title: "Task A", projectId: project.id, phaseId: phase.id, assigneeId: user1.id, dueDate: d(-2), status: "in_progress", priority: "high" } });
  const t2 = await p.task.create({ data: { title: "Task B", projectId: project.id, assigneeId: user1.id, dueDate: d(5), status: "planning", priority: "medium" } });
  const t3 = await p.task.create({ data: { title: "Task C", projectId: project.id, assigneeId: user2.id, dueDate: d(3), status: "in_progress", priority: "low" } });
  const t4 = await p.task.create({ data: { title: "Task D (done)", projectId: project.id, assigneeId: user1.id, dueDate: d(-5), status: "completed", priority: "medium" } });

  return { user1, user2, project, phase, t1, t2, t3, t4 };
}

beforeEach(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  cleanup = db.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe("getTasksForUser", () => {
  it("returns only tasks assigned to the given user, ordered by dueDate ASC", async () => {
    const { user1 } = await seed(prisma);
    const tasks = await getTasksForUser(user1.id, prisma);
    // user1 has Task D (due d(-5)), Task A (due d(-2)), Task B (due d(5)) — sorted ASC
    expect(tasks.map((t) => t.title)).toEqual(["Task D (done)", "Task A", "Task B"]);
    expect(tasks[0].project).toBeDefined();
  });

  it("returns empty array for unknown user", async () => {
    await seed(prisma);
    expect(await getTasksForUser("no-such-id", prisma)).toHaveLength(0);
  });
});

describe("getTasksForProject", () => {
  it("returns all tasks for a project, includes assignee", async () => {
    const { project } = await seed(prisma);
    const tasks = await getTasksForProject(project.id, prisma);
    expect(tasks).toHaveLength(4);
    expect(tasks[0].assignee).toBeDefined();
  });
});

describe("getOverdueTasks", () => {
  it("returns tasks past due that are not completed/killed", async () => {
    const { user1 } = await seed(prisma);
    const overdue = await getOverdueTasks(undefined, prisma);
    expect(overdue.map((t) => t.title)).toContain("Task A");
    expect(overdue.map((t) => t.title)).not.toContain("Task D (done)");
  });

  it("filters to a specific user when userId is given", async () => {
    const { user2 } = await seed(prisma);
    const overdue = await getOverdueTasks(user2.id, prisma);
    expect(overdue).toHaveLength(0); // user2's task C is not overdue (d(3))
  });
});
