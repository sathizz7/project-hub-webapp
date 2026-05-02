import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { ENGINEERING_PHASES, RESEARCH_PHASES } from "@/lib/phases";

export async function GET() {
  const projects = await prisma.project.findMany({
    include: {
      assignees: { include: { user: true } },
      phases: { orderBy: { order: "asc" } },
      submissions: true,
      checkpoints: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(projects);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    title,
    type,
    requirement,
    priority,
    timeboxDays,
    assigneeIds,
    techStack,
    aiPlan,
  } = body;

  const phases =
    type === "engineering" ? ENGINEERING_PHASES : RESEARCH_PHASES;

  const project = await prisma.project.create({
    data: {
      title,
      type,
      requirement,
      priority: priority || "medium",
      timeboxDays: timeboxDays || 14,
      currentPhase: phases[0].name,
      techStack: JSON.stringify(techStack || []),
      aiPlan: JSON.stringify(aiPlan || {}),
      assignees: {
        create: (assigneeIds || []).map((userId: string) => ({
          userId,
        })),
      },
      phases: {
        create: phases.map((phase, index) => ({
          phaseName: phase.name,
          status: index === 0 ? "active" : "pending",
          checklist: JSON.stringify(phase.checklist),
          order: index,
        })),
      },
    },
    include: {
      assignees: { include: { user: true } },
      phases: { orderBy: { order: "asc" } },
    },
  });

  return NextResponse.json(project, { status: 201 });
}
