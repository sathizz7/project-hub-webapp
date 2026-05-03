import { prisma } from "@/lib/prisma";
import { ReviewQueue } from "@/components/reviews/review-queue";
import type { SerializedReviewSub } from "@/lib/review-and-projects-helpers";

export default async function ReviewsPage() {
  const submissions = await prisma.submission.findMany({
    include: {
      project: { select: { id: true, title: true, requirement: true } },
      phase: { select: { phaseName: true } },
      user: { select: { id: true, name: true, avatarColor: true } },
      feedback: {
        orderBy: { createdAt: "asc" },
        include: { fromUser: { select: { id: true, name: true, avatarColor: true } } },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized: SerializedReviewSub[] = submissions.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    description: s.description,
    link: s.link,
    createdAt: s.createdAt.toISOString(),
    project: s.project,
    phase: s.phase,
    user: s.user,
    feedback: s.feedback.map((fb) => ({
      id: fb.id,
      text: fb.text,
      isAi: fb.isAi,
      createdAt: fb.createdAt.toISOString(),
      fromUser: fb.fromUser,
    })),
  }));

  return <ReviewQueue submissions={serialized} />;
}
