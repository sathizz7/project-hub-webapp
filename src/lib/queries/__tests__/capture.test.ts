import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/__tests__/_helpers/test-db";
import { getRecentCaptureSessions, getPendingCaptureItems } from "@/lib/queries/capture";

type TestPrisma = Awaited<ReturnType<typeof createTestDb>>["prisma"];

let prisma: TestPrisma;
let cleanup: () => Promise<void>;

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000);

async function seed(p: TestPrisma) {
  const ceo = await p.user.create({ data: { name: "Rahul", email: "rahul@test.com", role: "CEO", roleType: "ceo" } });
  const eng = await p.user.create({ data: { name: "Alice", email: "alice@test.com", role: "Engineer" } });

  const s1 = await p.captureSession.create({ data: { userId: ceo.id, rawInput: "Meeting notes from Monday", createdAt: d(-2) } });
  const s2 = await p.captureSession.create({ data: { userId: ceo.id, rawInput: "Quick thoughts from Tuesday", createdAt: d(-1) } });
  // Another user's session — should NOT appear in CEO's results
  await p.captureSession.create({ data: { userId: eng.id, rawInput: "Alice's notes", createdAt: d(0) } });

  // Items for s1
  const i1 = await p.captureItem.create({ data: { sessionId: s1.id, type: "todo", rawText: "raw1", title: "Todo item", priority: "high", status: "pending" } });
  const i2 = await p.captureItem.create({ data: { sessionId: s1.id, type: "follow_up", rawText: "raw2", title: "Follow up with team", priority: "medium", status: "converted" } });

  // Item for s2
  const i3 = await p.captureItem.create({ data: { sessionId: s2.id, type: "meeting", rawText: "raw3", title: "Schedule standup", priority: "low", status: "pending" } });

  return { ceo, eng, s1, s2, i1, i2, i3 };
}

beforeEach(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  cleanup = db.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe("getRecentCaptureSessions", () => {
  it("returns sessions for the given user, newest first, with items", async () => {
    const { ceo } = await seed(prisma);
    const sessions = await getRecentCaptureSessions(ceo.id, 10, prisma);
    expect(sessions).toHaveLength(2);
    expect(sessions[0].rawInput).toBe("Quick thoughts from Tuesday"); // newest first
    expect(sessions[0].items).toBeDefined();
  });

  it("does not return other users' sessions", async () => {
    const { eng } = await seed(prisma);
    const sessions = await getRecentCaptureSessions(eng.id, 10, prisma);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].rawInput).toBe("Alice's notes");
  });

  it("respects the limit parameter", async () => {
    const { ceo } = await seed(prisma);
    const sessions = await getRecentCaptureSessions(ceo.id, 1, prisma);
    expect(sessions).toHaveLength(1);
  });
});

describe("getPendingCaptureItems", () => {
  it("returns only pending items belonging to the user's sessions", async () => {
    const { ceo } = await seed(prisma);
    const items = await getPendingCaptureItems(ceo.id, prisma);
    expect(items).toHaveLength(2); // i1 (pending) + i3 (pending); i2 is converted
    expect(items.every((i) => i.status === "pending")).toBe(true);
  });
});
