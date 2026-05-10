import { NextResponse } from "next/server";

export async function POST() {
  const response = NextResponse.json({ status: "success", message: "Logged out", data: null });
  response.cookies.delete("ph_session");
  response.cookies.set("ph_refresh", "", { path: "/api/auth/refresh", maxAge: 0 });
  return response;
}
