import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().max(100).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = bodySchema.parse(body);
    const email = parsed.email;
    const password = parsed.password;
    const name = (parsed.name?.trim() || email.split("@")[0] || "User").slice(0, 100);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Email already registered" }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    const token = signToken({ userId: user.id, email: user.email });
    return NextResponse.json({ token, user });
  } catch (e: unknown) {
    if (e instanceof z.ZodError) {
      return NextResponse.json({ error: e.errors[0]?.message }, { status: 400 });
    }
    const prismaError = e as { code?: string };
    if (prismaError?.code === "P2021") {
      return NextResponse.json(
        {
          error:
            "Database tables missing. Run: npm run db:push:local then restart the dev server.",
        },
        { status: 503 }
      );
    }
    if (process.env.NODE_ENV !== "production") console.error("[signup]", e);
    return NextResponse.json({ error: "Signup failed" }, { status: 500 });
  }
}
