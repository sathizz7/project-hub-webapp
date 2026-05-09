import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      roleType: true,
      avatarColor: true,
      createdAt: true,
      // passwordHash intentionally excluded
      assignedProjects: {
        include: { project: true },
      },
      submissions: true,
    },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(users);
}
