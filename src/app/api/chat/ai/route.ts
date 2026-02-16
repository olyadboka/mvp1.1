import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "",
});

export async function POST(request: Request) {
  const me = await getCurrentUser(request);
  if (!me) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "OpenAI API key not configured. Add OPENAI_API_KEY to .env.local" },
      { status: 503 }
    );
  }

  let body: { message: string; history?: { role: "user" | "assistant"; content: string }[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }

  const history = Array.isArray(body.history) ? body.history : [];
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: "You are a helpful assistant in a chat app. Reply concisely and in a friendly tone.",
    },
    ...history.slice(-10).map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: message },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
    });

    const reply = completion.choices[0]?.message?.content?.trim() ?? "I couldn't generate a response.";
    return NextResponse.json({ reply });
  } catch (err: unknown) {
    console.error("OpenAI API error:", err);
    const rawMessage = err instanceof Error ? err.message : String(err);
    const code = err && typeof err === "object" && "code" in err ? (err as { code: string }).code : "";
    const isQuota =
      rawMessage.includes("quota") ||
      rawMessage.includes("billing") ||
      code === "insufficient_quota";
    const isRateLimit = rawMessage.includes("rate") || (err && typeof err === "object" && "status" in err && (err as { status: number }).status === 429);
    const userMessage = isQuota
      ? "Your OpenAI account has no remaining quota. Add a payment method at platform.openai.com or try again later."
      : isRateLimit
        ? "OpenAI is rate limiting. Wait a moment and try again."
        : rawMessage || "Something went wrong. Please try again.";
    return NextResponse.json({ error: userMessage }, { status: 502 });
  }
}
