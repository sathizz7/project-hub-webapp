import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      assignees: { include: { user: true } },
      phases: {
        orderBy: { order: "asc" },
        include: {
          submissions: {
            include: { user: true, feedback: { include: { fromUser: true } } },
            orderBy: { createdAt: "desc" },
          },
        },
      },
      checkpoints: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!project) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  return NextResponse.json(project);
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const project = await prisma.project.update({
    where: { id },
    data: body,
  });
  return NextResponse.json(project);
}
