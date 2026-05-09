import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";

describe("getSessionUser", () => {
  it("returns the user when a session exists", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "u1", name: "Rahul", email: "r@x", roleType: "ceo", jobTitle: "CEO", avatarColor: "#000" },
    });
    expect(await getSessionUser()).toMatchObject({ id: "u1", roleType: "ceo" });
  });

  it("returns null when no session", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    expect(await getSessionUser()).toBeNull();
  });
});
