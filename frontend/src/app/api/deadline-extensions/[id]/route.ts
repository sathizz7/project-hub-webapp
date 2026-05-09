import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json() as { status?: string; ceoComment?: string };

  const existing = await prisma.deadlineExtension.findUnique({ where: { id }, select: { id: true } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const data: Record<string, unknown> = {};
  if (body.status !== undefined) {
    data.status = body.status;
    if (body.status === "approved" || body.status === "rejected") {
      data.approvedAt = new Date();
    }
  }
  if (body.ceoComment !== undefined) data.ceoComment = body.ceoComment;

  const ext = await prisma.deadlineExtension.update({ where: { id }, data });
  return NextResponse.json(ext);
}
