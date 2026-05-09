import { getSessionUser } from "@/lib/session";
import { getRecentCaptureSessions } from "@/lib/queries";
import { CaptureView, type ParsedCaptureSession } from "@/components/capture/capture-view";
import { redirect } from "next/navigation";

export default async function CapturePage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const rawSessions = await getRecentCaptureSessions(user.id, 10);

  const sessions: ParsedCaptureSession[] = rawSessions.map(s => ({
    id: s.id,
    rawInput: s.rawInput,
    createdAt: s.createdAt.toISOString(),
    items: s.items.map(i => ({
      id: i.id,
      type: i.type,
      title: i.title,
      description: i.description,
      priority: i.priority,
      status: i.status,
      createdAt: i.createdAt.toISOString(),
    })),
  }));

  const initialSession = sessions[0] ?? undefined;

  return (
    <CaptureView
      recentSessions={sessions}
      userId={user.id}
      initialSession={initialSession}
    />
  );
}
