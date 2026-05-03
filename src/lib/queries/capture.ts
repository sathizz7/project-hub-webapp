import { prisma as defaultPrisma } from "@/lib/prisma";

type PrismaClient = typeof defaultPrisma;

const captureItemSelect = {
  id: true,
  type: true,
  rawText: true,
  title: true,
  description: true,
  department: true,
  dueDate: true,
  priority: true,
  status: true,
  projectId: true,
  convertedToType: true,
  convertedToId: true,
  createdAt: true,
  assignees: {
    select: {
      user: { select: { id: true, name: true, avatarColor: true } },
    },
  },
} as const;

export async function getRecentCaptureSessions(
  userId: string,
  limit = 10,
  db: PrismaClient = defaultPrisma
) {
  return db.captureSession.findMany({
    where: { userId },
    select: {
      id: true,
      rawInput: true,
      createdAt: true,
      userId: true,
      items: { select: captureItemSelect, orderBy: { createdAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getPendingCaptureItems(userId: string, db: PrismaClient = defaultPrisma) {
  return db.captureItem.findMany({
    where: {
      status: "pending",
      session: { userId },
    },
    select: captureItemSelect,
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}
