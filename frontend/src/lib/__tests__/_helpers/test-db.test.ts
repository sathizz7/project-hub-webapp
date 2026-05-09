import { describe, it, expect } from "vitest";
import { createTestDb } from "./test-db";

describe("createTestDb", () => {
  it("creates an isolated db, allows inserts, and cleans up", async () => {
    const { prisma, cleanup } = await createTestDb();

    const user = await prisma.user.create({
      data: { name: "Test User", email: "test@example.com", role: "Engineer" },
    });

    const found = await prisma.user.findUnique({ where: { id: user.id } });
    expect(found?.name).toBe("Test User");

    await cleanup();
  }, 30000);
});
