import { describe, it, expect, vi } from "vitest";

vi.mock("next-auth/jwt", () => ({
  getToken: vi.fn(),
}));

import { getToken } from "next-auth/jwt";
import middleware, { config } from "@/middleware";
import { NextRequest } from "next/server";

const url = (path: string) => `http://localhost:3000${path}`;

describe("middleware", () => {
  it("lets through whitelisted /login", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/login")));
    expect(res.status).toBe(200);
  });

  it("lets through /api/auth/providers", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/api/auth/providers")));
    expect(res.status).toBe(200);
  });

  it("lets through /design-demo without a session (dev tool)", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/design-demo")));
    expect(res.status).toBe(200);
  });

  it("redirects unauthenticated requests to /login", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const res = await middleware(new NextRequest(url("/projects")));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
  });

  it("lets through authenticated requests", async () => {
    (getToken as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "u1", roleType: "ceo" });
    const res = await middleware(new NextRequest(url("/projects")));
    expect(res.status).toBe(200);
  });

  it("exports a matcher config", () => {
    expect(config.matcher).toBeDefined();
  });
});
