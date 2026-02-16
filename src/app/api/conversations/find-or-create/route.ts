import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  const me = await getCurrentUser(request);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const otherUserId = body?.otherUserId as string;
  if (!otherUserId) {
    return NextResponse.json({ error: "otherUserId required" }, { status: 400 });
  }

  const [idA, idB] = [me.id, otherUserId].sort();

  let conv = await prisma.conversation.findUnique({
    where: {
      userAId_userBId: { userAId: idA, userBId: idB },
    },
    include: {
      userA: { select: { id: true, name: true, avatarUrl: true } },
      userB: { select: { id: true, name: true, avatarUrl: true } },
    },
  });

  if (!conv) {
    conv = await prisma.conversation.create({
      data: { userAId: idA, userBId: idB },
      include: {
        userA: { select: { id: true, name: true, avatarUrl: true } },
        userB: { select: { id: true, name: true, avatarUrl: true } },
      },
    });
  }

  const otherUser = conv.userAId === me.id ? conv.userB : conv.userA;
  return NextResponse.json({
    id: conv.id,
    otherUser,
  });
}
