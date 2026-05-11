import { apiServerFetch } from "@/lib/api";
import { buildWeekStrip, type SerializedLeaveRequest } from "@/lib/team-helpers";
import { AvailabilityView } from "@/components/team/availability-view";
import { getSessionUser } from "@/lib/session";
import { addDays } from "date-fns";

type LeaveOut = {
  id: string;
  user_id: string;
  type: string;
  start_date: string;
  end_date: string;
  days: number;
  reason: string | null;
  status: string;
  approved_by_id: string | null;
  cover_person_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  role_type: "ceo" | "team_member";
  avatar_color: string;
};

export default async function AvailabilityPage() {
  const today = new Date();
  const user = await getSessionUser();

  const [leaves, users] = await Promise.all([
    apiServerFetch<LeaveOut[]>("/api/v1/leaves"),
    apiServerFetch<UserRow[]>("/api/v1/users"),
  ]);

  const userById = new Map(users.map(u => [u.id, u]));

  // Adapter: snake_case LeaveOut → camelCase SerializedLeaveRequest
  function toSerialized(l: LeaveOut): SerializedLeaveRequest {
    const leaveUser = userById.get(l.user_id);
    const approver = l.approved_by_id ? userById.get(l.approved_by_id) ?? null : null;
    return {
      id: l.id,
      type: l.type,
      startDate: l.start_date,
      endDate: l.end_date,
      days: l.days,
      reason: l.reason ?? "",
      status: l.status,
      coveragePlan: "",
      contingencyNote: "",
      createdAt: l.created_at,
      user: {
        id: l.user_id,
        name: leaveUser?.name ?? "Unknown",
        avatarColor: leaveUser?.avatar_color ?? "#6b7280",
        role: leaveUser?.role ?? "",
      },
      approvedBy: approver ? { id: approver.id, name: approver.name } : null,
    };
  }

  const pendingLeaves = leaves.filter(l => l.status === "pending");
  const today37 = addDays(today, 37);
  const yesterday = addDays(today, -1);

  const allNearLeaves = leaves.filter(l =>
    l.status === "approved" &&
    new Date(l.start_date) <= today37 &&
    new Date(l.end_date) >= yesterday
  );

  const weekDays = buildWeekStrip(
    today,
    [...pendingLeaves, ...allNearLeaves].map(l => ({
      startDate: l.start_date,
      endDate: l.end_date,
      user: {
        id: l.user_id,
        name: userById.get(l.user_id)?.name ?? "Unknown",
        avatarColor: userById.get(l.user_id)?.avatar_color ?? "#6b7280",
      },
    }))
  );

  const serializedPending: SerializedLeaveRequest[] = pendingLeaves.map(toSerialized);

  const upcomingLeaves = allNearLeaves
    .filter(l => new Date(l.start_date) >= today || new Date(l.end_date) >= today)
    .map(toSerialized);

  return (
    <AvailabilityView
      weekDays={weekDays}
      pendingLeaves={serializedPending}
      upcomingLeaves={upcomingLeaves}
      ceoId={user?.id ?? ""}
    />
  );
}
