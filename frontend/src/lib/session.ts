import { cookies } from "next/headers";

export type SessionUser = {
  id: string;
  name: string;
  email: string;
  roleType: "ceo" | "team_member";
  jobTitle: string;
  avatarColor: string;
};

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

/**
 * Resolve the current authenticated user by reading the ph_session cookie
 * and calling FastAPI's GET /api/v1/auth/me. Returns null if the cookie is
 * missing, the token is invalid/expired, or the backend is unreachable —
 * the call site can then decide to redirect or render a logged-out view.
 *
 * Field mapping (FastAPI snake_case → frontend camelCase):
 *   role        → jobTitle  (the user's job title text, e.g. "Senior Engineer")
 *   role_type   → roleType  (the access role, "ceo" | "team_member")
 *   avatar_color → avatarColor
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("ph_session")?.value;
  if (!token) return null;

  try {
    const res = await fetch(`${API_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const envelope = await res.json();
    if (envelope.status !== "success") return null;
    const u = envelope.data;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      roleType: u.role_type,
      jobTitle: u.role,
      avatarColor: u.avatar_color,
    };
  } catch {
    return null;
  }
}
