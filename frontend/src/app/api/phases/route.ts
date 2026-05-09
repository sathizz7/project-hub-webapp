import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest) {
  const { phaseId, status, projectId, nextPhaseId } = await req.json();

  await prisma.phase.update({
    where: { id: phaseId },
    data: { status },
  });

  if (status === "completed" && nextPhaseId) {
    await prisma.phase.update({
      where: { id: nextPhaseId },
      data: { status: "active" },
    });

    const nextPhase = await prisma.phase.findUnique({
      where: { id: nextPhaseId },
    });

    if (nextPhase) {
      await prisma.project.update({
        where: { id: projectId },
        data: { currentPhase: nextPhase.phaseName },
      });
    }
  }

  if (status === "completed" && !nextPhaseId) {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "completed", currentPhase: "Done" },
    });
  }

  return NextResponse.json({ success: true });
}
