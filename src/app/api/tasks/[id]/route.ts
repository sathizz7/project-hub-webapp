import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { status?: string; priority?: string; assigneeId?: string };

  const existing = await prisma.task.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    data.completedAt = body.status === "completed" ? new Date() : null;
  }
  if (body.priority !== undefined) data.priority = body.priority;
  if (body.assigneeId !== undefined) data.assigneeId = body.assigneeId;

  const task = await prisma.task.update({ where: { id }, data });
  return NextResponse.json(task);
}
