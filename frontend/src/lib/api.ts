import { cookies } from "next/headers";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Server-side fetch wrapper for calling FastAPI from React Server Components.
 * Reads ph_session from cookies, attaches Authorization: Bearer, parses the
 * {status, message, data} envelope, and returns the data field.
 *
 * Throws ApiError on non-2xx responses or envelope.status !== "success".
 *
 * NOTE: this is for SERVER components only. Client components should call
 * /api/proxy/v1/<path> via plain fetch (no token handling needed — the proxy
 * route handler injects the Bearer header from the cookie).
 */
export async function apiServerFetch<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ph_session")?.value;

  const headers = new Headers(init?.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  if (!res.ok) {
    throw new ApiError(res.status, `${res.status} ${res.statusText} on ${path}`);
  }

  const envelope = await res.json();
  if (envelope.status !== "success") {
    throw new ApiError(res.status, envelope.message ?? "API error");
  }
  return envelope.data as T;
}
