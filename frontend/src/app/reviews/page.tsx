import { apiServerFetch } from "@/lib/api";
import { ReviewQueue } from "@/components/reviews/review-queue";
import type { SerializedReviewSub } from "@/lib/review-and-projects-helpers";

type BackendFeedback = {
  id: string;
  submission_id: string;
  from_user_id: string | null;
  text: string;
  is_ai: boolean;
  created_at: string;
  from_user: { id: string; name: string; avatar_color: string } | null;
};

type BackendSubmission = {
  id: string;
  project_id: string | null;
  phase_id: string | null;
  user_id: string;
  title: string;
  type: string;
  description: string | null;
  link: string | null;
  created_at: string;
  project: { id: string; title: string; requirement: string } | null;
  phase: { id: string; phase_name: string } | null;
  user: { id: string; name: string; avatar_color: string } | null;
  feedback: BackendFeedback[];
};

export default async function ReviewsPage() {
  const rows = await apiServerFetch<BackendSubmission[]>(
    "/api/v1/submissions?include=feedback,project,phase,user"
  );

  // Adapt snake_case → camelCase to match SerializedReviewSub.
  // <ReviewQueue> downstream is unchanged.
  const serialized: SerializedReviewSub[] = rows.map((s) => ({
    id: s.id,
    title: s.title,
    type: s.type,
    description: s.description ?? "",
    link: s.link ?? "",
    createdAt: s.created_at,
    project: s.project ?? { id: "", title: "(unknown)", requirement: "" },
    phase: { phaseName: s.phase?.phase_name ?? "(unknown)" },
    user: s.user
      ? { id: s.user.id, name: s.user.name, avatarColor: s.user.avatar_color }
      : { id: "", name: "(unknown)", avatarColor: "#888" },
    feedback: s.feedback.map((fb) => ({
      id: fb.id,
      text: fb.text,
      isAi: fb.is_ai,
      createdAt: fb.created_at,
      fromUser: fb.from_user
        ? { id: fb.from_user.id, name: fb.from_user.name, avatarColor: fb.from_user.avatar_color }
        : { id: "", name: "AI", avatarColor: "#888" },
    })),
  }));

  return <ReviewQueue submissions={serialized} />;
}
