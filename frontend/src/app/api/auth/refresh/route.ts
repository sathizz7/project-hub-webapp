import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const isProd = process.env.NODE_ENV === "production";
const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30;

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get("ph_refresh")?.value;
  if (!refreshToken) {
    return NextResponse.json(
      { status: "failure", message: "No refresh token", data: null },
      { status: 401 },
    );
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/v1/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });
  } catch {
    return NextResponse.json(
      { status: "failure", message: "Backend unreachable", data: null },
      { status: 502 },
    );
  }

  const envelope = await upstream.json();
  if (!upstream.ok || envelope.status !== "success") {
    return NextResponse.json(envelope, { status: upstream.status });
  }

  const response = NextResponse.json({ status: "success", message: "OK", data: null });
  response.cookies.set("ph_session", envelope.data.access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  return response;
}
