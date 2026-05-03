import { prisma as defaultPrisma } from "@/lib/prisma";

type PrismaClient = typeof defaultPrisma;

// urgencyScore formula: priorityWeight + ageInHours / 24
// priorityWeight: critical=4, high=3, medium=2, low=1, (no priority)=2
const PRIORITY_WEIGHT: Record<string, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

function ageScore(createdAt: Date): number {
  const ageMs = Date.now() - createdAt.getTime();
  return ageMs / (1000 * 60 * 60 * 24); // days old
}

export type ReviewInboxItem = {
  kind: "review";
  id: string;
  title: string;
  project: { id: string; title: string };
  submitter: { id: string; name: string; avatarColor: string };
  createdAt: Date;
  urgencyScore: number;
};

export type CaptureInboxItem = {
  kind: "capture";
  id: string;
  title: string;
  itemType: string;
  createdAt: Date;
  urgencyScore: number;
};

export type ExtensionInboxItem = {
  kind: "extension";
  id: string;
  project: { id: string; title: string };
  requestedBy: { id: string; name: string; avatarColor: string };
  daysRequested: number;
  createdAt: Date;
  urgencyScore: number;
};

export type InboxItem = ReviewInboxItem | CaptureInboxItem | ExtensionInboxItem;

export async function getActionInbox(
  userId: string,
  db: PrismaClient = defaultPrisma
): Promise<InboxItem[]> {
  // 1. Pending submissions that have no feedback yet from this user
  const submissions = await db.submission.findMany({
    where: {
      feedback: { none: { fromUserId: userId } },
    },
    select: {
      id: true,
      title: true,
      createdAt: true,
      project: { select: { id: true, title: true } },
      user: { select: { id: true, name: true, avatarColor: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  // 2. Pending capture items for this user's sessions
  const captureItems = await db.captureItem.findMany({
    where: { status: "pending", session: { userId } },
    select: { id: true, title: true, type: true, priority: true, createdAt: true },
    orderBy: { createdAt: "asc" },
  });

  // 3. Pending deadline extensions across all projects
  const extensions = await db.deadlineExtension.findMany({
    where: { status: "pending" },
    select: {
      id: true,
      requestedDeadline: true,
      originalDeadline: true,
      escalationLevel: true,
      createdAt: true,
      project: { select: { id: true, title: true } },
      requestedBy: { select: { id: true, name: true, avatarColor: true } },
    },
    orderBy: [{ escalationLevel: "desc" }, { createdAt: "asc" }],
  });

  const reviewItems: ReviewInboxItem[] = submissions.map((s) => ({
    kind: "review",
    id: s.id,
    title: s.title,
    project: s.project,
    submitter: s.user,
    createdAt: s.createdAt,
    urgencyScore: PRIORITY_WEIGHT["medium"] + ageScore(s.createdAt),
  }));

  const captureInboxItems: CaptureInboxItem[] = captureItems.map((ci) => ({
    kind: "capture",
    id: ci.id,
    title: ci.title,
    itemType: ci.type,
    createdAt: ci.createdAt,
    urgencyScore: (PRIORITY_WEIGHT[ci.priority] ?? 2) + ageScore(ci.createdAt),
  }));

  const extensionItems: ExtensionInboxItem[] = extensions.map((e) => {
    const daysRequested = Math.round(
      (e.requestedDeadline.getTime() - e.originalDeadline.getTime()) / (1000 * 60 * 60 * 24)
    );
    return {
      kind: "extension",
      id: e.id,
      project: e.project,
      requestedBy: e.requestedBy,
      daysRequested,
      createdAt: e.createdAt,
      // Escalated extensions get a high priority boost
      urgencyScore: PRIORITY_WEIGHT["high"] + e.escalationLevel * 2 + ageScore(e.createdAt),
    };
  });

  const all: InboxItem[] = [...reviewItems, ...captureInboxItems, ...extensionItems];
  all.sort((a, b) => b.urgencyScore - a.urgencyScore || b.createdAt.getTime() - a.createdAt.getTime());
  return all;
}
