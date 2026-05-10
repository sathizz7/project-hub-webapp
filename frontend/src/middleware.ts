import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PATHS = ["/login", "/design-demo"];

export default function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/auth")) {
    return NextResponse.next();
  }

  // Presence check only — backend validates the token's signature/expiry.
  // An expired token will be rejected by FastAPI on the first authenticated
  // call, and the proxy will surface the 401 to the client.
  if (!req.cookies.get("ph_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("from", pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
