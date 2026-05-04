import { prisma } from "@/lib/prisma";
import { getPendingLeaveRequests } from "@/lib/queries";
import { buildWeekStrip, type SerializedLeaveRequest } from "@/lib/team-helpers";
import { AvailabilityView } from "@/components/team/availability-view";
import { getSessionUser } from "@/lib/session";
import { addDays } from "date-fns";

export default async function AvailabilityPage() {
  const today = new Date();
  const user = await getSessionUser();

  const [pendingLeaves, allNearLeaves] = await Promise.all([
    getPendingLeaveRequests(),
    prisma.leaveRequest.findMany({
      where: {
        status: "approved",
        startDate: { lte: addDays(today, 37) },
        endDate: { gte: addDays(today, -1) },
      },
      include: {
        user: { select: { id: true, name: true, avatarColor: true, role: true } },
        approvedBy: { select: { id: true, name: true } },
      },
      orderBy: { startDate: "asc" },
    }),
  ]);

  const weekDays = buildWeekStrip(
    today,
    [...pendingLeaves, ...allNearLeaves].map(l => ({
      startDate: l.startDate.toISOString(),
      endDate: l.endDate.toISOString(),
      user: l.user,
    }))
  );

  const serializeLeave = (l: typeof allNearLeaves[number]): SerializedLeaveRequest => ({
    id: l.id, type: l.type,
    startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(),
    days: l.days, reason: l.reason, status: l.status,
    coveragePlan: l.coveragePlan, contingencyNote: l.contingencyNote,
    createdAt: l.createdAt.toISOString(),
    user: l.user, approvedBy: l.approvedBy ?? null,
  });

  const serializedPending: SerializedLeaveRequest[] = pendingLeaves.map(l => ({
    id: l.id, type: l.type,
    startDate: l.startDate.toISOString(), endDate: l.endDate.toISOString(),
    days: l.days, reason: l.reason, status: l.status,
    coveragePlan: l.coveragePlan, contingencyNote: l.contingencyNote,
    createdAt: l.createdAt.toISOString(),
    user: l.user, approvedBy: l.approvedBy ?? null,
  }));

  const upcomingLeaves = allNearLeaves
    .filter(l => new Date(l.startDate) >= today || new Date(l.endDate) >= today)
    .map(serializeLeave);

  return (
    <AvailabilityView
      weekDays={weekDays}
      pendingLeaves={serializedPending}
      upcomingLeaves={upcomingLeaves}
      ceoId={user?.id ?? ""}
    />
  );
}
