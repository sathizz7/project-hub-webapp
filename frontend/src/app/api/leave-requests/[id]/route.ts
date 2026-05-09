import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { status?: string; approvedById?: string };

  const existing = await prisma.leaveRequest.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "approved" || body.status === "rejected") {
      data.approvedAt = new Date();
    }
  }
  if (body.approvedById !== undefined) data.approvedById = body.approvedById;

  const leave = await prisma.leaveRequest.update({ where: { id }, data });
  return NextResponse.json(leave);
}
