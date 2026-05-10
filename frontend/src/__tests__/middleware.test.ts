import { describe, it, expect } from "vitest";

import middleware, { config } from "@/middleware";
import { NextRequest } from "next/server";

const url = (path: string) => `http://localhost:3000${path}`;

function reqWithCookie(path: string, cookie?: string): NextRequest {
  const init: { headers?: Record<string, string> } = {};
  if (cookie) init.headers = { cookie };
  return new NextRequest(url(path), init);
}

describe("middleware", () => {
  it("lets through whitelisted /login", () => {
    const res = middleware(reqWithCookie("/login"));
    expect(res.status).toBe(200);
  });

  it("lets through /api/auth/providers", () => {
    const res = middleware(reqWithCookie("/api/auth/providers"));
    expect(res.status).toBe(200);
  });

  it("lets through /design-demo without a session (dev tool)", () => {
    const res = middleware(reqWithCookie("/design-demo"));
    expect(res.status).toBe(200);
  });

  it("redirects requests with no ph_session cookie to /login", () => {
    const res = middleware(reqWithCookie("/projects"));
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toContain("/login");
    expect(res.headers.get("location")).toContain("from=%2Fprojects");
  });

  it("lets through requests carrying a ph_session cookie", () => {
    const res = middleware(reqWithCookie("/projects", "ph_session=any-jwt-value"));
    expect(res.status).toBe(200);
  });

  it("exports a matcher config", () => {
    expect(config.matcher).toBeDefined();
  });
});
