import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTasksForProject, getExtensionsForProject } from "@/lib/queries";
import { ProjectWorkspace } from "@/components/projects/workspace/project-workspace";
import type {
  ProjectWorkspaceData,
  AiPlan,
  SerializedPhase,
  SerializedTask,
  SerializedExtension,
  SerializedCheckpoint,
} from "@/components/projects/workspace/types";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, tasks, extensions] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: {
        assignees: { include: { user: { select: { id: true, name: true, avatarColor: true } } } },
        phases: {
          orderBy: { order: "asc" },
          include: {
            submissions: {
              orderBy: { createdAt: "desc" },
              include: {
                user: { select: { id: true, name: true, avatarColor: true } },
                feedback: {
                  orderBy: { createdAt: "asc" },
                  include: { fromUser: { select: { id: true, name: true, avatarColor: true } } },
                },
              },
            },
          },
        },
        checkpoints: { orderBy: { createdAt: "desc" } },
      },
    }),
    getTasksForProject(id),
    getExtensionsForProject(id),
  ]);

  if (!project) notFound();

  // Parse JSON fields server-side — never pass raw JSON strings to Client Components
  let aiPlan: AiPlan = {};
  try { aiPlan = JSON.parse(project.aiPlan || "{}"); } catch { /* ignore */ }

  let techStack: string[] = [];
  try { techStack = JSON.parse(project.techStack || "[]"); } catch { /* ignore */ }

  const serializedPhases: SerializedPhase[] = project.phases.map(phase => {
    let checklist: string[] = [];
    try { checklist = JSON.parse(phase.checklist || "[]"); } catch { /* ignore */ }
    return {
      id: phase.id,
      phaseName: phase.phaseName,
      status: phase.status,
      order: phase.order,
      checklist,
      submissions: phase.submissions.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        description: s.description,
        link: s.link,
        createdAt: s.createdAt.toISOString(),
        user: s.user,
        feedback: s.feedback.map(fb => ({
          id: fb.id,
          text: fb.text,
          isAi: fb.isAi,
          createdAt: fb.createdAt.toISOString(),
          fromUser: fb.fromUser,
        })),
      })),
    };
  });

  const serializedTasks: SerializedTask[] = tasks.map(t => ({
    id: t.id,
    title: t.title,
    priority: t.priority as SerializedTask["priority"],
    status: t.status,
    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
    assignee: t.assignee ? { id: t.assignee.id, name: t.assignee.name } : null,
  }));

  const serializedExtensions: SerializedExtension[] = extensions.map(e => ({
    id: e.id,
    reason: e.reason,
    reasonDetail: e.reasonDetail,
    status: e.status,
    ceoComment: e.ceoComment,
    originalDeadline: e.originalDeadline.toISOString(),
    requestedDeadline: e.requestedDeadline.toISOString(),
    escalationLevel: e.escalationLevel,
    createdAt: e.createdAt.toISOString(),
    task: e.task ? { id: e.task.id, title: e.task.title, priority: e.task.priority } : null,
    requestedBy: e.requestedBy,
  }));

  const serializedCheckpoints: SerializedCheckpoint[] = project.checkpoints.map(c => ({
    id: c.id,
    decision: c.decision,
    notes: c.notes,
    createdAt: c.createdAt.toISOString(),
  }));

  const data: ProjectWorkspaceData = {
    id: project.id,
    title: project.title,
    requirement: project.requirement,
    type: project.type,
    priority: project.priority,
    status: project.status,
    currentPhase: project.currentPhase,
    startDate: project.startDate.toISOString(),
    timeboxDays: project.timeboxDays,
    techStack,
    aiPlan,
    phases: serializedPhases,
    checkpoints: serializedCheckpoints,
    assignees: project.assignees.map(a => ({ user: a.user })),
    tasks: serializedTasks,
    extensions: serializedExtensions,
  };

  return <ProjectWorkspace data={data} />;
}
