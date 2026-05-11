import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { apiServerFetch } from "@/lib/api";
import { CaptureView, type ParsedCaptureSession } from "@/components/capture/capture-view";

type BackendCaptureItem = {
  id: string;
  session_id: string;
  type: string;
  raw_text: string | null;
  title: string;
  description: string | null;
  department: string | null;
  due_date: string | null;
  priority: string;
  status: string;
  project_id: string | null;
  converted_to_type: string | null;
  converted_to_id: string | null;
  created_at: string;
  updated_at: string | null;
};

type BackendCaptureSession = {
  id: string;
  user_id: string;
  raw_input: string;
  created_at: string;
  items: BackendCaptureItem[];
};

function adapt(s: BackendCaptureSession): ParsedCaptureSession {
  return {
    id: s.id,
    rawInput: s.raw_input,
    createdAt: s.created_at,
    items: s.items.map(i => ({
      id: i.id,
      type: i.type,
      title: i.title,
      description: i.description ?? "",
      priority: i.priority,
      status: i.status,
      createdAt: i.created_at,
    })),
  };
}

export default async function CapturePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const raw = await apiServerFetch<BackendCaptureSession[]>("/api/v1/capture/sessions?limit=10");
  const sessions = raw.map(adapt);
  const initialSession = sessions[0] ?? undefined;

  return (
    <CaptureView
      recentSessions={sessions}
      userId={user.id}
      initialSession={initialSession}
    />
  );
}
