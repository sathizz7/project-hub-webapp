import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("projectId");
  const pending = searchParams.get("pending");

  const where: Record<string, unknown> = {};
  if (projectId) where.projectId = projectId;

  const submissions = await prisma.submission.findMany({
    where,
    include: {
      user: true,
      project: true,
      phase: true,
      feedback: { include: { fromUser: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (pending === "true") {
    const filtered = submissions.filter((s) => s.feedback.length === 0);
    return NextResponse.json(filtered);
  }

  return NextResponse.json(submissions);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { phaseId, projectId, userId, title, type, description, link } = body;

  const submission = await prisma.submission.create({
    data: {
      phaseId,
      projectId,
      userId,
      title,
      type,
      description,
      link: link || "",
    },
    include: {
      user: true,
      phase: true,
    },
  });

  return NextResponse.json(submission, { status: 201 });
}
