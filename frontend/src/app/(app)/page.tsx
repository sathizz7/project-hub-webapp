import { redirect } from "next/navigation";
import { apiServerFetch, ApiError } from "@/lib/api";
import { getSessionUser } from "@/lib/session";
import { CeoCommandCenter } from "@/components/landing/ceo-command-center";
import { TeamMyTodayStub } from "@/components/landing/team-my-today-stub";

// ── Shared sub-types ──────────────────────────────────────────────────────────

type InboxUser = { id: string; name: string; avatar_color: string };

export type InboxLeave = {
  id: string;
  user: InboxUser;
  type: "planned" | "sick" | "personal" | "wfh" | "half_day";
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  created_at: string;
};

export type InboxExtension = {
  id: string;
  requested_by: InboxUser;
  project_id: string | null;
  project_title: string | null;
  task_id: string | null;
  task_title: string | null;
  original_deadline: string;
  requested_deadline: string;
  reason: string | null;
  escalation_level: number;
  created_at: string;
};

export type InboxReview = {
  id: string;
  title: string;
  created_at: string;
  project: { id: string; title: string };
  submitter: { id: string; name: string; avatar_color: string };
};

export type InboxCapture = {
  id: string;
  title: string;
  item_type: string;
  priority: string;
  created_at: string;
};

// ── API response shapes ───────────────────────────────────────────────────────

type InboxResponse = {
  pending_leaves: InboxLeave[];
  pending_extensions: InboxExtension[];
  pending_reviews: InboxReview[];
  pending_captures: InboxCapture[];
};

type LeaveOut = {
  id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  created_at: string;
};

type ExtensionOut = {
  id: string;
  project_id: string | null;
  task_id: string | null;
  requested_by_id: string;
  original_deadline: string;
  requested_deadline: string;
  reason: string | null;
  status: string;
  escalation_level: number;
  created_at: string;
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function HomePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const firstName = user.name.split(" ")[0] || user.name;

  if (user.roleType !== "ceo") {
    return <TeamMyTodayStub name={firstName} />;
  }

  // CEO path — one round-trip via the aggregated inbox endpoint
  let pendingLeaves: InboxLeave[] = [];
  let pendingExtensions: InboxExtension[] = [];
  let pendingReviews: InboxReview[] = [];
  let pendingCaptures: InboxCapture[] = [];

  try {
    const inbox = await apiServerFetch<InboxResponse>("/api/v1/inbox");
    pendingLeaves = inbox.pending_leaves;
    pendingExtensions = inbox.pending_extensions;
    pendingReviews = inbox.pending_reviews;
    pendingCaptures = inbox.pending_captures;
  } catch (err) {
    // If the inbox endpoint is unreachable, render with empty arrays rather
    // than crashing the whole page. A 403 here would be a bug (CEO should
    // always have access), but we log and continue gracefully.
    if (!(err instanceof ApiError) || err.status !== 403) {
      console.error("[HomePage] Failed to fetch /api/v1/inbox:", err);
    }
  }

  return (
    <CeoCommandCenter
      userId={user.id}
      name={firstName}
      pendingLeaves={pendingLeaves}
      pendingExtensions={pendingExtensions}
      pendingReviews={pendingReviews}
      pendingCaptures={pendingCaptures}
    />
  );
}
