"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Avatar } from "@/components/Avatar";
import { SettingsIcon, ChatBubbleIcon } from "@/components/Icons";

export default function ChatSettingsPage() {
  const { user } = useAuth();

  return (
    <div className="h-full flex flex-col bg-[var(--bg)]">
      <header className="flex items-center gap-4 px-4 py-3 bg-white border-b border-[var(--border)] shrink-0">
        <Link href="/chat" className="flex items-center gap-2 text-slate-600 hover:text-slate-800">
          <span className="text-lg">←</span>
          <span className="text-sm font-medium">Back to chat</span>
        </Link>
        <div className="flex items-center gap-2 text-slate-500">
          <ChatBubbleIcon size={20} />
          <span className="text-sm">chat app</span>
        </div>
      </header>
      <div className="p-6 max-w-lg flex-1 overflow-y-auto">
        <h1 className="text-xl font-semibold text-slate-800 mb-6 flex items-center gap-2">
          <SettingsIcon size={24} className="text-brand-500" />
          Settings
        </h1>
        <div className="bg-white rounded-xl border border-[var(--border)] p-6 space-y-4">
          <div className="flex items-center gap-4">
            <Avatar name={user?.name ?? ""} src={user?.avatarUrl} size="lg" />
            <div>
              <p className="font-medium text-slate-800">{user?.name}</p>
              <p className="text-sm text-slate-500">{user?.email}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Account and notification settings can be added here. For this MVP, auth is handled via JWT.
          </p>
          <Link
            href="/chat"
            className="inline-block text-sm font-medium text-brand-500 hover:text-brand-600"
          >
            ← Back to chat
          </Link>
        </div>
      </div>
    </div>
  );
}
