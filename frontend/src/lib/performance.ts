import { apiServerFetch } from "@/lib/api";

type BackendFeedback = {
  id: string;
  submission_id: string;
  from_user_id: string | null;
  text: string;
  is_ai: boolean;
  created_at: string;
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
  feedback: BackendFeedback[];
};

export type PerformanceMetrics = {
  submissionsCount: number;
  avgResponseHours: number;
  score: number;
};

export async function computePerformanceMetrics(userId: string): Promise<PerformanceMetrics> {
  const submissions = await apiServerFetch<BackendSubmission[]>(
    `/api/v1/submissions?user_id=${userId}&include=feedback`
  );

  if (submissions.length === 0) {
    return { submissionsCount: 0, avgResponseHours: 0, score: 0 };
  }

  const feedbackedSubs = submissions.filter((s) => s.feedback.length > 0);
  const turnarounds = feedbackedSubs.map((s) => {
    const firstFeedbackMs = Math.min(
      ...s.feedback.map((f) => new Date(f.created_at).getTime())
    );
    const ms = firstFeedbackMs - new Date(s.created_at).getTime();
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
