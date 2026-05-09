import { prisma as defaultPrisma } from "@/lib/prisma";

type PrismaClient = typeof defaultPrisma;

export type PerformanceMetrics = {
  submissionsCount: number;
  avgResponseHours: number;
  // score formula: min(100, submissionsCount * 10 + onTimeRate * 50)
  // onTimeRate = fraction of feedbacks that arrived within 24h of submission
  score: number;
};

export async function computePerformanceMetrics(
  userId: string,
  db: PrismaClient = defaultPrisma
): Promise<PerformanceMetrics> {
  const submissions = await db.submission.findMany({
    where: { userId },
    select: {
      id: true,
      createdAt: true,
      feedback: { select: { createdAt: true }, orderBy: { createdAt: "asc" }, take: 1 },
    },
  });

  if (submissions.length === 0) {
    return { submissionsCount: 0, avgResponseHours: 0, score: 0 };
  }

  const feedbackedSubs = submissions.filter((s) => s.feedback.length > 0);
  const turnarounds = feedbackedSubs.map((s) => {
    const ms = s.feedback[0].createdAt.getTime() - s.createdAt.getTime();
    return ms / (1000 * 60 * 60); // hours
  });

  const avgResponseHours =
    turnarounds.length > 0
      ? turnarounds.reduce((a, b) => a + b, 0) / turnarounds.length
      : 0;

  const onTimeCount = turnarounds.filter((h) => h <= 24).length;
  const onTimeRate = turnarounds.length > 0 ? onTimeCount / turnarounds.length : 0;

  const score = Math.min(100, submissions.length * 10 + onTimeRate * 50);

  return {
    submissionsCount: submissions.length,
    avgResponseHours: Math.round(avgResponseHours * 100) / 100,
    score: Math.round(score),
  };
}
