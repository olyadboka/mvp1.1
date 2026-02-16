"use client";

import { redirect } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--bg)]">
        <div className="animate-pulse text-slate-500">Loading...</div>
      </div>
    );
  }

  if (user) {
    redirect("/chat");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--bg)] px-4">
      <div className="text-center max-w-md">
        <div className="w-12 h-12 rounded-lg bg-brand-500 mx-auto mb-4" aria-hidden />
        <h1 className="text-3xl md:text-4xl font-bold text-slate-800 mb-2">chat app</h1>
        <p className="text-slate-600 mb-8">Real-time messaging. See who&apos;s online, chat with anyone, or try Chat with AI.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/signup"
            className="px-6 py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition"
          >
            Get started free
          </Link>
          <Link
            href="/login"
            className="px-6 py-3.5 rounded-xl border border-[var(--border)] hover:border-brand-500 hover:bg-white text-slate-700 font-medium transition"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
