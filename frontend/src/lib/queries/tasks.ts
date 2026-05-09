import { prisma as defaultPrisma } from "@/lib/prisma";

type PrismaClient = typeof defaultPrisma;

const taskSelect = {
  id: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  dueDate: true,
  completedAt: true,
  createdAt: true,
  projectId: true,
  phaseId: true,
  assigneeId: true,
  project: { select: { id: true, title: true, type: true } },
  phase: { select: { id: true, phaseName: true, order: true } },
  assignee: { select: { id: true, name: true, avatarColor: true } },
} as const;

export async function getTasksForUser(userId: string, db: PrismaClient = defaultPrisma) {
  return db.task.findMany({
    where: { assigneeId: userId },
    select: taskSelect,
    orderBy: [{ dueDate: "asc" }],
  });
}

export async function getTasksForProject(projectId: string, db: PrismaClient = defaultPrisma) {
  return db.task.findMany({
    where: { projectId },
    select: taskSelect,
    orderBy: [{ dueDate: "asc" }],
  });
}

export async function getOverdueTasks(userId?: string, db: PrismaClient = defaultPrisma) {
  return db.task.findMany({
    where: {
      dueDate: { lt: new Date() },
      status: { notIn: ["completed", "killed"] },
      ...(userId ? { assigneeId: userId } : {}),
    },
    select: taskSelect,
    orderBy: [{ dueDate: "asc" }],
  });
}
