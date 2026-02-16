import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const me = await getCurrentUser(request);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: {
      OR: [{ userAId: me.id }, { userBId: me.id }],
    },
    include: {
      userA: { select: { id: true, name: true, avatarUrl: true, email: true } },
      userB: { select: { id: true, name: true, avatarUrl: true, email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { content: true, createdAt: true, senderId: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const list = conversations.map((c) => {
    const other = c.userAId === me.id ? c.userB : c.userA;
    const last = c.messages[0];
    return {
      id: c.id,
      otherUser: other,
      lastMessage: last
        ? { content: last.content, createdAt: last.createdAt, senderId: last.senderId }
        : null,
    };
  });

  return NextResponse.json(list);
}
