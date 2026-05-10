import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCookieGet = vi.fn();

vi.mock("next/headers", () => ({
  cookies: () => Promise.resolve({ get: mockCookieGet }),
}));

import { getSessionUser } from "@/lib/session";

beforeEach(() => {
  mockCookieGet.mockReset();
  vi.unstubAllGlobals();
});

describe("getSessionUser", () => {
  it("returns null when ph_session cookie is missing", async () => {
    mockCookieGet.mockReturnValue(undefined);
    expect(await getSessionUser()).toBeNull();
  });

  it("returns the mapped user when /auth/me succeeds", async () => {
    mockCookieGet.mockReturnValue({ value: "valid-jwt" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            status: "success",
            message: "OK",
            data: {
              id: "u1",
              name: "Rahul",
              email: "r@x.com",
              role: "Senior Engineer",
              role_type: "ceo",
              avatar_color: "#000",
            },
          }),
      }),
    );

    const user = await getSessionUser();
    expect(user).toEqual({
      id: "u1",
      name: "Rahul",
      email: "r@x.com",
      roleType: "ceo",
      jobTitle: "Senior Engineer",
      avatarColor: "#000",
    });
  });

  it("returns null when /auth/me responds non-2xx", async () => {
    mockCookieGet.mockReturnValue({ value: "expired-jwt" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, json: () => Promise.resolve({}) }));
    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when envelope.status is not 'success'", async () => {
    mockCookieGet.mockReturnValue({ value: "valid-jwt" });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ status: "failure", message: "boom", data: null }),
      }),
    );
    expect(await getSessionUser()).toBeNull();
  });

  it("returns null when fetch throws (backend unreachable)", async () => {
    mockCookieGet.mockReturnValue({ value: "valid-jwt" });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("ECONNREFUSED")));
    expect(await getSessionUser()).toBeNull();
  });
});
