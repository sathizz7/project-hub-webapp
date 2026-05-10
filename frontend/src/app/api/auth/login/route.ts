import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const isProd = process.env.NODE_ENV === "production";

const ACCESS_TTL_SECONDS = 60 * 60 * 24 * 30; // 30 days
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 90; // 90 days

export async function POST(req: NextRequest) {
  const body = await req.json();

  let upstream: Response;
  try {
    upstream = await fetch(`${API_URL}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
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

  const { access_token, refresh_token, user } = envelope.data;

  // Strip tokens from the response sent to the browser. Only the user payload
  // crosses back; the tokens live in HTTP-only cookies the browser can't read.
  const response = NextResponse.json({ status: "success", message: "OK", data: { user } });

  response.cookies.set("ph_session", access_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/",
    maxAge: ACCESS_TTL_SECONDS,
  });
  response.cookies.set("ph_refresh", refresh_token, {
    httpOnly: true,
    secure: isProd,
    sameSite: "lax",
    path: "/api/auth/refresh",
    maxAge: REFRESH_TTL_SECONDS,
  });

  return response;
}
