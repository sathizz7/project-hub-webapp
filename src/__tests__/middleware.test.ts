import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

import { auth } from "@/lib/auth";
import middleware, { config } from "@/middleware";
import { NextRequest } from "next/server";

const url = (path: string) => `http://localhost:3000${path}`;

describe("middleware", () => {
  it("lets through whitelisted /login", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/login")));
    expect(res.status).toBe(200);
  });

  it("lets through /api/auth/providers", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/api/auth/providers")));
    expect(res.status).toBe(200);
  });

  it("lets through /design-demo without a session (dev tool)", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/design-demo")));
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated requests to /login", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/projects")));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("lets through authenticated requests", async () => {
    (auth as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "u1", roleType: "ceo" },
    });
    const res = await middleware(new NextRequest(url("/projects")));
    expect(res.status).toBe(200);
  });

  it("exports a matcher config", () => {
    expect(config.matcher).toBeDefined();
  });
});
