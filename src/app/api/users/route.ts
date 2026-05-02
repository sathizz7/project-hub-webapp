import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    include: {
      assignedProjects: {
        include: { project: true },
      },
      submissions: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
