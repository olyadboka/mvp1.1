import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { comparePassword, signToken } from "@/lib/auth";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = bodySchema.parse(body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const token = signToken({ userId: user.id, email: user.email });
    const { password: _, ...safe } = user;
    return NextResponse.json({ token, user: safe });
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
    if (process.env.NODE_ENV !== "production") console.error("[login]", e);
    return NextResponse.json({ error: "Login failed" }, { status: 500 });
  }
}
