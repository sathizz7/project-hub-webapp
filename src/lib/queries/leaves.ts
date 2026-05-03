import { prisma as defaultPrisma } from "@/lib/prisma";

type PrismaClient = typeof defaultPrisma;

const leaveSelect = {
  id: true,
  type: true,
  startDate: true,
  endDate: true,
  days: true,
  reason: true,
  status: true,
  coveragePlan: true,
  contingencyNote: true,
  approvedAt: true,
  createdAt: true,
  user: { select: { id: true, name: true, avatarColor: true, role: true } },
  approvedBy: { select: { id: true, name: true } },
  coverPerson: { select: { id: true, name: true, avatarColor: true } },
} as const;

export async function getPendingLeaveRequests(db: PrismaClient = defaultPrisma) {
  return db.leaveRequest.findMany({
    where: { status: "pending" },
    select: leaveSelect,
    orderBy: { startDate: "asc" },
  });
}

export async function getActiveLeaves(date: Date, db: PrismaClient = defaultPrisma) {
  return db.leaveRequest.findMany({
    where: {
      status: "approved",
      startDate: { lte: date },
      endDate: { gte: date },
    },
    select: leaveSelect,
    orderBy: { startDate: "asc" },
  });
}

export async function getUpcomingLeavesForUser(
  userId: string,
  withinDays: number,
  db: PrismaClient = defaultPrisma
) {
  const from = new Date();
  const to = new Date(from.getTime() + withinDays * 86400000);
  return db.leaveRequest.findMany({
    where: {
      userId,
      status: "approved",
      startDate: { gte: from, lte: to },
    },
    select: leaveSelect,
    orderBy: { startDate: "asc" },
  });
}
