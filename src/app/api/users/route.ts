import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const me = await getCurrentUser(request);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    where: { id: { not: me.id } },
    select: { id: true, email: true, name: true, avatarUrl: true },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(users);
}
