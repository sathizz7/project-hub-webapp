import { prisma as defaultPrisma } from "@/lib/prisma";

type PrismaClient = typeof defaultPrisma;

const extensionSelect = {
  id: true,
  reason: true,
  reasonDetail: true,
  status: true,
  ceoComment: true,
  originalDeadline: true,
  requestedDeadline: true,
  escalationLevel: true,
  approvedAt: true,
  createdAt: true,
  project: { select: { id: true, title: true, type: true } },
  task: { select: { id: true, title: true, priority: true } },
  requestedBy: { select: { id: true, name: true, avatarColor: true, role: true } },
  approvedBy: { select: { id: true, name: true } },
} as const;

export async function getPendingExtensions(db: PrismaClient = defaultPrisma) {
  return db.deadlineExtension.findMany({
    where: { status: "pending" },
    select: extensionSelect,
    orderBy: [{ escalationLevel: "desc" }, { createdAt: "asc" }],
  });
}

export async function getExtensionsForProject(projectId: string, db: PrismaClient = defaultPrisma) {
  return db.deadlineExtension.findMany({
    where: { projectId },
    select: extensionSelect,
    orderBy: { createdAt: "desc" },
  });
}
