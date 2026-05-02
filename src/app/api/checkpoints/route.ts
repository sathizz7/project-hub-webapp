import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { projectId, decision, notes } = await req.json();

  const checkpoint = await prisma.checkpoint.create({
    data: { projectId, decision, notes },
  });

  if (decision === "kill") {
    await prisma.project.update({
      where: { id: projectId },
      data: { status: "killed" },
    });
  }

  return NextResponse.json(checkpoint, { status: 201 });
}
