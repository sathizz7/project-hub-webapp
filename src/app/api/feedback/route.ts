import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const { submissionId, fromUserId, text, isAi } = await req.json();

  const feedback = await prisma.feedback.create({
    data: {
      submissionId,
      fromUserId,
      text,
      isAi: isAi || false,
    },
    include: { fromUser: true },
  });

  return NextResponse.json(feedback, { status: 201 });
}
