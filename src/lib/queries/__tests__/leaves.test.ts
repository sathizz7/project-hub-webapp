import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createTestDb } from "@/lib/__tests__/_helpers/test-db";
import { getPendingLeaveRequests, getActiveLeaves, getUpcomingLeavesForUser } from "@/lib/queries/leaves";

type TestPrisma = Awaited<ReturnType<typeof createTestDb>>["prisma"];

let prisma: TestPrisma;
let cleanup: () => Promise<void>;

const now = new Date();
const d = (offsetDays: number) => new Date(now.getTime() + offsetDays * 86400000);

async function seed(p: TestPrisma) {
  const user1 = await p.user.create({ data: { name: "Alice", email: "alice@test.com", role: "Eng" } });
  const user2 = await p.user.create({ data: { name: "Bob", email: "bob@test.com", role: "PM" } });

  // pending
  const l1 = await p.leaveRequest.create({ data: { userId: user1.id, type: "planned", startDate: d(5), endDate: d(7), days: 3, reason: "Vacation", status: "pending" } });
  // approved - currently active (today falls in range)
  const l2 = await p.leaveRequest.create({ data: { userId: user2.id, type: "sick", startDate: d(-1), endDate: d(1), days: 2, reason: "Flu", status: "approved" } });
  // approved - upcoming
  const l3 = await p.leaveRequest.create({ data: { userId: user1.id, type: "personal", startDate: d(10), endDate: d(12), days: 3, reason: "Event", status: "approved" } });
  // rejected - should not show in pending or upcoming
  await p.leaveRequest.create({ data: { userId: user2.id, type: "planned", startDate: d(20), endDate: d(25), days: 6, reason: "Trip", status: "rejected" } });

  return { user1, user2, l1, l2, l3 };
}

beforeEach(async () => {
  const db = await createTestDb();
  prisma = db.prisma;
  cleanup = db.cleanup;
});

afterEach(async () => {
  await cleanup();
});

describe("getPendingLeaveRequests", () => {
  it("returns only pending leave requests with user info", async () => {
    await seed(prisma);
    const leaves = await getPendingLeaveRequests(prisma);
    expect(leaves).toHaveLength(1);
    expect(leaves[0].status).toBe("pending");
    expect(leaves[0].user).toBeDefined();
  });
});

describe("getActiveLeaves", () => {
  it("returns leaves where the given date falls within the range", async () => {
    await seed(prisma);
    const active = await getActiveLeaves(now, prisma);
    expect(active).toHaveLength(1);
    expect(active[0].type).toBe("sick");
  });

  it("returns empty when no leaves cover the given date", async () => {
    await seed(prisma);
    const active = await getActiveLeaves(d(50), prisma);
    expect(active).toHaveLength(0);
  });
});

describe("getUpcomingLeavesForUser", () => {
  it("returns approved future leaves for user within withinDays window", async () => {
    const { user1 } = await seed(prisma);
    const upcoming = await getUpcomingLeavesForUser(user1.id, 15, prisma);
    expect(upcoming).toHaveLength(1);
    expect(upcoming[0].type).toBe("personal");
  });

  it("excludes pending and rejected", async () => {
    const { user1 } = await seed(prisma);
    // user1 has a pending leave at d(5), approved at d(10)
    const upcoming = await getUpcomingLeavesForUser(user1.id, 30, prisma);
    expect(upcoming.every((l) => l.status === "approved")).toBe(true);
  });
});
