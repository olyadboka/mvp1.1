"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { apiUrl } from "@/lib/api";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch(apiUrl("/api/auth/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      login(data.token, data.user);
      router.push("/chat");
      router.refresh();
    } catch {
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      <div className="md:w-1/2 bg-[var(--bg)] flex flex-col justify-center px-8 py-12 md:px-12 md:py-16">
        <div className="w-10 h-10 rounded-lg bg-brand-500 mb-6" aria-hidden />
        <h1 className="text-2xl md:text-3xl font-bold text-slate-800 leading-tight">
          Stay connected with everyone that matters.
        </h1>
        <p className="text-slate-600 mt-3 max-w-sm">
          Real-time messaging, always in sync. Sign in to pick up where you left off.
        </p>
        <ul className="mt-8 space-y-3 text-slate-600 text-sm">
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center text-xs font-bold">✓</span>
            Messages saved across devices
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center text-xs font-bold">✓</span>
            See who&apos;s online
          </li>
          <li className="flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-brand-100 text-brand-500 flex items-center justify-center text-xs font-bold">✓</span>
            Chat with AI when you need it
          </li>
        </ul>
      </div>
      <div className="md:w-1/2 flex items-center justify-center px-6 py-12 md:px-16">
        <div className="w-full max-w-sm">
          <h2 className="text-xl font-semibold text-slate-800 mb-1">Welcome back</h2>
          <p className="text-slate-500 text-sm mb-6">Sign in to continue to chat app</p>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm" role="alert">{error}</div>
            )}
            <label className="block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
              placeholder="you@example.com"
            />
            <label className="block text-sm font-medium text-slate-700">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] text-slate-800 placeholder-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
              placeholder="••••••••"
            />
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="text-center text-slate-500 text-sm mt-6">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="text-brand-500 hover:text-brand-600 font-medium">Sign up free</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
