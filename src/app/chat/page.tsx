"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { useWebSocket } from "@/hooks/useWebSocket";
import { apiUrl } from "@/lib/api";
import { Avatar } from "@/components/Avatar";
import {
  SettingsIcon,
  PaperclipIcon,
  PaperPlaneIcon,
  SearchIcon,
  PenIcon,
  VideoCallIcon,
  PhoneIcon,
  InfoCircleIcon,
  RobotIcon,
  EmojiIcon,
  BellIcon,
  DotsThreeIcon,
  CheckDoubleIcon,
  MicrophoneIcon,
  AddressBookIcon,
  CloseIcon,
  LinkIcon,
  ChevronDownIcon,
} from "@/components/Icons";

type User = {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
};
type Conv = {
  id: string;
  otherUser: User;
  lastMessage: { content: string; createdAt: string; senderId: string } | null;
};
type Msg = {
  id: string;
  content: string;
  createdAt: string;
  sender: { id: string; name: string; avatarUrl: string | null };
  isMe: boolean;
};

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const timeStr = d.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  if (d.toDateString() === now.toDateString()) {
    return "Today at " + timeStr;
  }
  return (
    d.toLocaleDateString([], { month: "short", day: "numeric" }) +
    " at " +
    timeStr
  );
}

export default function ChatPage() {
  const { user, token, logout } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [conversations, setConversations] = useState<Conv[]>([]);
  const [selectedConv, setSelectedConv] = useState<{
    id: string;
    otherUser: User;
  } | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loadingConv, setLoadingConv] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [showNewChat, setShowNewChat] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<"media" | "link" | "docs">(
    "docs",
  );
  const [activeTab, setActiveTab] = useState<"messages" | "teams">("messages");
  const [contextMenu, setContextMenu] = useState<{
    convId: string;
    x: number;
    y: number;
  } | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const isChatWithAI = selectedConv?.otherUser?.id === "__ai__";
  const messagesEndRef = useRef<HTMLDivElement>(null);

  function openAIChat() {
    setShowNewChat(false);
    setSelectedConv({
      id: "__ai__",
      otherUser: {
        id: "__ai__",
        email: "",
        name: "Chat with AI",
        avatarUrl: null,
      },
    });
    setMessages([]);
    setShowRightPanel(false);
  }

  // Figma demo content – used only when there is no real data yet
  const demoChats = [
    {
      id: "demo-1",
      name: "Adrian Kurt",
      subtitle: "Thanks for the explanation!",
      time: "3 mins ago",
      unread: true,
    },
    {
      id: "demo-2",
      name: "Yomi Immanuel",
      subtitle: "Let's do a quick call after lunch, I'll explain...",
      time: "12 mins ago",
      unread: false,
    },
    {
      id: "demo-3",
      name: "Bianca Nubia",
      subtitle: "anytime my pleasure~",
      time: "32 mins ago",
      unread: false,
    },
    {
      id: "demo-4",
      name: "Zender Lowre",
      subtitle: "Okay cool, that makes sense 😊",
      time: "1 hour ago",
      unread: false,
    },
  ];

  function relativeTime(iso: string): string {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffM = Math.floor(diffMs / 60000);
    const diffH = Math.floor(diffM / 60);
    const diffD = Math.floor(diffH / 24);
    if (diffM < 1) return "Just now";
    if (diffM < 60) return `${diffM} min ago`;
    if (diffH < 24) return `${diffH} hour ago`;
    if (diffD === 1) return "Yesterday";
    if (diffD < 7) return `${diffD} days ago`;
    return d.toLocaleDateString();
  }
  const selectedConvIdRef = useRef<string | null>(null);
  const userIdRef = useRef<string | null>(null);
  selectedConvIdRef.current = selectedConv?.id ?? null;
  userIdRef.current = user?.id ?? null;

  const fetchUsers = useCallback(async () => {
    if (!token) return;
    setLoadingUsers(true);
    const res = await fetch(apiUrl("/api/users"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setUsers(await res.json());
    setLoadingUsers(false);
  }, [token]);

  const fetchConversations = useCallback(async () => {
    if (!token) return;
    const res = await fetch(apiUrl("/api/conversations"), {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) setConversations(await res.json());
  }, [token]);

  const tokenRefForFetch = useRef(token);
  tokenRefForFetch.current = token;

  const handleIncomingMessage = useCallback(
    (payload: {
      id: string;
      conversationId: string;
      senderId: string;
      content: string;
      createdAt: string;
      sender: { id: string; name: string; avatarUrl: string | null };
    }) => {
      const convId = selectedConvIdRef.current;
      const isMe = payload.senderId === userIdRef.current;

      if (convId === payload.conversationId) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          if (isMe) {
            let tempIdx = -1;
            for (let i = prev.length - 1; i >= 0; i--) {
              if (
                prev[i].id.startsWith("temp-") &&
                prev[i].content === payload.content
              ) {
                tempIdx = i;
                break;
              }
            }
            if (tempIdx >= 0) {
              const next = [...prev];
              next[tempIdx] = {
                id: payload.id,
                content: payload.content,
                createdAt: payload.createdAt,
                sender: payload.sender,
                isMe: true,
              };
              return next;
            }
          }
          return [
            ...prev,
            {
              id: payload.id,
              content: payload.content,
              createdAt: payload.createdAt,
              sender: payload.sender,
              isMe,
            },
          ];
        });
        // Sync from DB shortly after so the other user always sees it even if real-time missed
        const cid = payload.conversationId;
        setTimeout(() => {
          const t = tokenRefForFetch.current;
          if (!t) return;
          fetch(apiUrl(`/api/conversations/${cid}/messages`), {
            headers: { Authorization: `Bearer ${t}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((data) => {
              if (data && selectedConvIdRef.current === cid) {
                setMessages(data.messages || []);
              }
            })
            .catch(() => {});
        }, 400);
      } else {
        fetchConversations();
      }
    },
    [fetchConversations],
  );

  const { onlineUserIds, lastMessage, connected, sendBroadcast } = useWebSocket(
    token,
    handleIncomingMessage,
  );

  useEffect(() => {
    fetchUsers();
    fetchConversations();
  }, [fetchUsers, fetchConversations]);

  // Auto-open a conversation so the layout always shows an active chat like the design
  // - If there are existing conversations and none is selected yet, open the first one
  // - If there are no conversations, default to "Chat with AI"
  useEffect(() => {
    if (selectedConv || showNewChat) return;
    if (conversations.length > 0) {
      void selectExistingConv(conversations[0]);
    } else {
      setSelectedConv({
        id: "__ai__",
        otherUser: {
          id: "__ai__",
          email: "",
          name: "Chat with AI",
          avatarUrl: null,
        },
      });
      setMessages([]);
    }
  }, [conversations, selectedConv, showNewChat]);

  // Refetch messages from DB when conversation is selected or window regains focus
  const refetchMessagesFromDb = useCallback(async () => {
    if (!token || !selectedConv || selectedConv.id === "__ai__") return;
    try {
      const res = await fetch(
        apiUrl(`/api/conversations/${selectedConv.id}/messages`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        const data = await res.json();
        setMessages(Array.isArray(data.messages) ? data.messages : []);
      }
    } catch {}
  }, [token, selectedConv?.id]);

  useEffect(() => {
    if (selectedConv) refetchMessagesFromDb();
  }, [selectedConv?.id, refetchMessagesFromDb]);

  const selectedConvRef = useRef(selectedConv);
  selectedConvRef.current = selectedConv;

  useEffect(() => {
    function onFocus() {
      fetchConversations();
      if (selectedConvRef.current) {
        const convId = selectedConvRef.current.id;
        if (token) {
          fetch(apiUrl(`/api/conversations/${convId}/messages`), {
            headers: { Authorization: `Bearer ${token}` },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then(
              (data) =>
                data &&
                Array.isArray(data.messages) &&
                setMessages(data.messages),
            )
            .catch(() => {});
        }
      }
    }
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [fetchConversations, token]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function openConversation(otherUser: User) {
    setShowNewChat(false);
    setLoadingConv(true);
    try {
      const res = await fetch(apiUrl("/api/conversations/find-or-create"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ otherUserId: otherUser.id }),
      });
      if (!res.ok) return;
      const data = await res.json();
      const msgRes = await fetch(
        apiUrl(`/api/conversations/${data.id}/messages`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const msgData = msgRes.ok ? await msgRes.json() : { messages: [] };
      setSelectedConv({ id: data.id, otherUser: data.otherUser });
      setMessages(Array.isArray(msgData.messages) ? msgData.messages : []);
    } finally {
      setLoadingConv(false);
    }
  }

  async function selectExistingConv(conv: Conv) {
    setShowNewChat(false);
    setLoadingConv(true);
    try {
      const res = await fetch(
        apiUrl(`/api/conversations/${conv.id}/messages`),
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      const data = res.ok ? await res.json() : { messages: [] };
      setSelectedConv({ id: conv.id, otherUser: conv.otherUser });
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    } finally {
      setLoadingConv(false);
    }
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || !selectedConv || !token || !user) return;
    const tempId = "temp-" + Date.now();
    setInput("");
    setMessages((prev) => [
      ...prev,
      {
        id: tempId,
        content: text,
        createdAt: new Date().toISOString(),
        sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
        isMe: true,
      },
    ]);
    fetchConversations();
    try {
      const res = await fetch(
        apiUrl(`/api/conversations/${selectedConv.id}/messages`),
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ content: text }),
        },
      );
      if (res.ok) {
        const data = await res.json();
        const msg = data.message;
        if (msg) {
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    id: msg.id,
                    content: msg.content,
                    createdAt: msg.createdAt,
                    sender: msg.sender ?? {
                      id: user.id,
                      name: user.name,
                      avatarUrl: user.avatarUrl,
                    },
                    isMe: true,
                  }
                : m,
            ),
          );
        }
        sendBroadcast(selectedConv.id, msg);
      } else {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
      }
    } catch {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
    }
  };

  const handleSendAI = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (
      !text ||
      !selectedConv ||
      selectedConv.otherUser.id !== "__ai__" ||
      !token ||
      !user
    ) {
      return;
    }
    const userMsgId = "ai-user-" + Date.now();
    const aiMsgId = "ai-reply-" + Date.now();
    setInput("");
    const userMsg: Msg = {
      id: userMsgId,
      content: text,
      createdAt: new Date().toISOString(),
      sender: { id: user.id, name: user.name, avatarUrl: user.avatarUrl },
      isMe: true,
    };
    const placeholderMsg: Msg = {
      id: aiMsgId,
      content: "...",
      createdAt: new Date().toISOString(),
      sender: { id: "__ai__", name: "Chat with AI", avatarUrl: null },
      isMe: false,
    };
    setMessages((prev) => [...prev, userMsg, placeholderMsg]);
    try {
      const history = messages
        .filter((m) => m.sender.id === "__ai__" || m.isMe)
        .slice(-20)
        .map((m) => ({
          role: m.isMe ? ("user" as const) : ("assistant" as const),
          content: m.content,
        }));
      const res = await fetch(apiUrl("/api/chat/ai"), {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: text, history }),
      });
      const data = await res.json();
      const reply =
        res.ok && data.reply
          ? data.reply
          : data.error || "Something went wrong.";
      setMessages((prev) =>
        prev.map((m) => (m.id === aiMsgId ? { ...m, content: reply } : m)),
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsgId
            ? { ...m, content: "Could not reach the AI. Try again." }
            : m,
        ),
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--app-outer)] px-4 sm:px-6 py-6 sm:py-10 text-[var(--text)]">
      <div className="flex w-full max-w-6xl h-[min(90vh,720px)] gap-3 rounded-[20px] bg-[var(--gap-bg)] shadow-[var(--shadow-card)] overflow-hidden">
        {/* Sidebar – full height from top; gap to its right, then header + content */}
        <aside className="w-[68px] flex flex-col items-center justify-between pt-6 pb-6 bg-[var(--sidebar-bg)] rounded-l-[20px] shrink-0 border-r border-[var(--separator-light)]">
          {/* Top: 1st item, then 2rem gap, then the other items */}
          <div className="flex flex-col items-center shrink-0">
            <div
              className="w-12 h-12 shrink-0 flex items-center justify-center rounded-[var(--radius-app)] overflow-hidden"
              aria-hidden
            >
              <img
                src="/icons/icon-brand.png"
                alt=""
                className="w-full h-full object-contain"
                width={48}
                height={48}
              />
            </div>
            <div className="h-8 shrink-0" aria-hidden />
            <nav className="flex flex-col items-center gap-1">
              <Link
                href="/"
                className="p-2 rounded-full flex items-center justify-center"
                title="Home"
              >
                <img
                  src="/icons/icon-home.png"
                  alt="Home"
                  className="w-10 h-10 object-contain"
                  width={28}
                  height={28}
                />
              </Link>
              <button
                type="button"
                className="p-2 rounded-full bg-[var(--accent-light)] border-2 border-[var(--accent)] shadow-sm flex items-center justify-center"
                title="Messages (active)"
              >
                <img
                  src="/icons/icon-messages.png"
                  alt="Messages"
                  className="w-7 h-7 object-contain"
                  width={28}
                  height={28}
                />
              </button>
              {/* <button
              type="button"
              className="p-2 rounded-full hover:bg-white/80 transition flex items-center justify-center"
              title="Explore"
            >
              <img src="/icons/icon-explore.png" alt="Explore" className="w-7 h-7 object-contain" width={28} height={28} />
            </button> */}
              <button
                type="button"
                className="p-2 rounded-full flex items-center justify-center"
                title="Files"
              >
                <img
                  src="/icons/icon-files.png"
                  alt="Files"
                  className="w-10 h-10 object-contain"
                  width={28}
                  height={28}
                />
              </button>
              <button
                type="button"
                className="p-2 rounded-full flex items-center justify-center"
                title="Media"
              >
                <img
                  src="/icons/icon-media.png"
                  alt="Media"
                  className="w-10 h-10 object-contain"
                  width={28}
                  height={28}
                />
              </button>
            </nav>
          </div>

          <div className="mt-auto flex flex-col items-center gap-5">
            <button
              type="button"
              onClick={openAIChat}
              className="p-2 rounded-full flex items-center justify-center"
              title="Chat with AI"
            >
              <img
                src="/icons/icon-chat-ai.png"
                alt="Chat with AI"
                className="w-7 h-7 object-contain"
                width={28}
                height={28}
              />
            </button>
            <Avatar name={user?.name ?? ""} src={user?.avatarUrl} size="sm" />
          </div>
        </aside>

        {/* Main shell: header (starts after gap) + gap + chat area, rounded right corners */}
        <div className="relative flex-1 bg-[var(--sidebar-bg)] flex flex-col min-w-0 rounded-r-[20px] rounded-br-[20px] rounded-bl-[20px] rounded-tr-[20px] rounded-tl-[20px] m-2 ">
          <header className="shrink-0 min-h-[44px] flex items-center justify-between gap-4 px-4 py-2 bg-[var(--content-bg)] border-b border-[var(--separator)] overflow-visible rounded-br-[20px] rounded-bl-[20px] rounded-tr-[20px] rounded-tl-[20px]">
            <div className="flex items-center gap-2 pl-3 pr-4 py-2 rounded-[var(--radius-pill)] bg-white text-slate-700 text-sm shrink-0">
              <img
                src="/icons/icon-message-bubble.png"
                alt=""
                className="w-6 h-6 object-contain shrink-0"
                width={24}
                height={24}
              />
              <span className="text-slate-700 font-medium">Message</span>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
              <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-[var(--radius-pill)] bg-[#f5f5f4] border border-[var(--border)] text-slate-500 text-sm min-w-[228px] max-w-[288px]">
                <SearchIcon size={20} className="text-slate-400 shrink-0" />
                <span className="flex-1 text-left truncate">Search</span>
                <kbd className="px-2 py-0.5 rounded-md bg-white/80 border border-[var(--border)] text-slate-800 text-xs font-medium shrink-0">
                  ⌘+K
                </kbd>
              </div>
              <button
                type="button"
                className="p-1.5 rounded-[12px] border border-[var(--border)] bg-white hover:bg-slate-100 transition text-slate-600"
                title="Notifications"
              >
                <BellIcon size={20} />
              </button>
              <Link
                href="/chat/settings"
                className="p-1.5 rounded-[12px] border border-[var(--border)] bg-white hover:bg-slate-100 transition text-slate-600"
                title="Settings"
              >
                <SettingsIcon size={20} />
              </Link>
              <div
                className="w-px h-6 bg-[var(--separator)] shrink-0"
                aria-hidden
              />
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="flex items-center gap-1.5 pl-1 pr-2 py-1 rounded-[var(--radius-app)] bg-white hover:bg-slate-50 cursor-pointer"
                  title="Profile"
                  aria-expanded={profileOpen}
                  aria-haspopup="true"
                >
                  <Avatar
                    name={user?.name ?? ""}
                    src={user?.avatarUrl}
                    size="sm"
                  />
                  <ChevronDownIcon
                    size={16}
                    className="text-slate-500 shrink-0"
                  />
                </button>
                {profileOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      aria-hidden
                      onClick={() => setProfileOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[var(--radius-app)] shadow-lg border border-[var(--border)] z-50 overflow-hidden">
                      <div className="p-4 border-b border-[var(--border)]">
                        <div className="flex items-center gap-3">
                          <Avatar
                            name={user?.name ?? ""}
                            src={user?.avatarUrl}
                            size="lg"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-slate-800 truncate">
                              {user?.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {user?.email ?? "—"}
                            </p>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setProfileOpen(false);
                          logout();
                        }}
                        className="w-full px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 text-left font-medium"
                      >
                        Log out
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </header>

          {/* Gap between header and content */}
          <div className="shrink-0 h-3 bg-[var(--sidebar-bg)]" />

          <div className="flex-1 flex min-h-0 bg-transparent pl-0 pr-5 pt-2 pb-6">
            <div className="flex-1 flex min-h-0 gap-2 rounded-[20px] overflow-hidden bg-[var(--sidebar-bg)]">
              {/* Chat list – thin separator on right, gap between list and chat */}
              <aside className="w-[300px] sm:w-[320px] flex flex-col border-r border-[var(--separator)] bg-[var(--content-bg)] shrink-0 rounded-l-[20px]  rounded-br-[20px] rounded-bl-[20px] rounded-tr-[20px] rounded-tl-[20px]">
                <div className="px-5 py-5 ">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-bold text-slate-900 text-lg">
                      All Message
                    </h2>
                    <button
                      type="button"
                      onClick={() => setShowNewChat(true)}
                      className="flex items-center gap-2 px-4 py-2 rounded-[12px] bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white text-xs font-semibold transition"
                    >
                      <PenIcon size={20} className="text-white" />
                      New Message
                    </button>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 flex items-center gap-2.5 px-4 py-2.5 rounded-[12px] bg-white border border-[var(--border)] text-slate-500 text-sm">
                      <SearchIcon
                        size={18}
                        className="text-slate-500 shrink-0"
                      />
                      <span className="flex-1 text-left">
                        Search in message
                      </span>
                    </div>
                    <button
                      type="button"
                      className="flex items-center justify-center w-11 h-11 rounded-[12px] bg-white border border-[var(--border)] hover:bg-slate-50 transition text-slate-600 shrink-0"
                      title="Filter"
                    >
                      <img
                        src="/icons/icon-filter.png"
                        alt="Filter"
                        className="w-[32px] h-[22px] object-contain"
                        width={22}
                        height={22}
                      />
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0 px-3 pb-4">
                  {loadingUsers ? (
                    <div className="px-5 py-6 text-center text-slate-500 text-sm">
                      Loading...
                    </div>
                  ) : (
                    <>
                      {conversations.map((c) => (
                        <div
                          key={c.id}
                          className={`relative flex items-start gap-3 rounded-[12px] cursor-pointer transition text-left px-3 py-2.5 my-1.5 ${
                            selectedConv?.id === c.id && !showNewChat
                              ? "bg-[var(--accent-light)]"
                              : "hover:bg-slate-50"
                          }`}
                          onClick={() => selectExistingConv(c)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({
                              convId: c.id,
                              x: e.clientX,
                              y: e.clientY,
                            });
                          }}
                        >
                          <div className="relative shrink-0 mt-0.5">
                            <Avatar
                              name={c.otherUser.name}
                              src={c.otherUser.avatarUrl}
                              size="md"
                            />
                            {onlineUserIds.has(c.otherUser.id) && (
                              <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--accent)] border-2 border-white" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-900 truncate">
                              {c.otherUser.name}
                            </p>
                            <p className="text-xs text-slate-500 truncate">
                              {c.lastMessage?.content ?? "No messages"}
                            </p>
                          </div>
                          <div className="shrink-0 flex flex-col items-end gap-0.5">
                            <span className="text-[11px] text-slate-400">
                              {c.lastMessage?.createdAt
                                ? relativeTime(c.lastMessage.createdAt)
                                : ""}
                            </span>
                            {c.lastMessage?.senderId === userIdRef.current && (
                              <span
                                className="text-[var(--accent)]"
                                title="Read"
                              >
                                <CheckDoubleIcon size={14} />
                              </span>
                            )}
                          </div>
                        </div>
                      ))}

                      {/* When there are no real conversations yet, show the Figma demo chat list */}
                      {conversations.length === 0 &&
                        demoChats.map((chat) => (
                          <div
                            key={chat.id}
                            className="relative flex items-start gap-3 rounded-[12px] px-3 py-2.5 my-1.5 cursor-default text-left hover:bg-slate-50"
                          >
                            <div className="relative shrink-0 mt-0.5">
                              <Avatar name={chat.name} src={null} size="md" />
                              {chat.unread && (
                                <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[var(--accent)] border-2 border-white" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">
                                {chat.name}
                              </p>
                              <p className="text-xs text-slate-500 truncate">
                                {chat.subtitle}
                              </p>
                            </div>
                            <div className="shrink-0 flex flex-col items-end gap-0.5">
                              <span className="text-[11px] text-slate-400">
                                {chat.time}
                              </span>
                              {chat.unread && (
                                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 rounded-[var(--radius-pill)] bg-[var(--accent)] text-[10px] text-white font-medium">
                                  1
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      {conversations.length === 0 && !loadingUsers && (
                        <div className="px-5 py-3 text-xs text-slate-400">
                          This is demo data only. Start chatting to replace it
                          with real conversations.
                        </div>
                      )}
                    </>
                  )}
                </div>
              </aside>

              {/* Context menu - Mark unread, Archive, Mute, Contact info, Export, Clear, Delete */}
              {contextMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    aria-hidden
                    onClick={() => setContextMenu(null)}
                  />
                  <div
                    className="fixed z-50 bg-white rounded-[12px] shadow-lg border border-[var(--border)] py-1 min-w-[180px]"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                  >
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span aria-hidden>📖</span> Mark as unread
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span aria-hidden>📦</span> Archive
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span aria-hidden>🔇</span> Mute
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowRightPanel(true);
                        setRightPanelTab("docs");
                        setContextMenu(null);
                      }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span aria-hidden>👤</span> Contact info
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span aria-hidden>↗</span> Export chat
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 text-left"
                    >
                      <span aria-hidden>✕</span> Clear chat
                    </button>
                    <button
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 text-left font-medium"
                      onClick={() => setContextMenu(null)}
                    >
                      <span aria-hidden>🗑</span> Delete chat
                    </button>
                  </div>
                </>
              )}

              {/* Main content – chat pane: white outer frame 20px, inner panel 20px, padding so both rounded edges show */}
              <main className="flex-1 flex flex-col min-w-0 bg-white rounded-[20px] min-h-0 overflow-hidden p-3">
                <div
                  className="flex-1 flex flex-col min-h-0 bg-white overflow-hidden isolate"
                  style={{ borderRadius: "20px" }}
                >
                  {showNewChat ? (
                    <div className="flex-1 flex flex-col p-6">
                      <h2 className="text-lg font-semibold text-slate-800 mb-4">
                        Start a new chat
                      </h2>
                      {users.length === 0 ? (
                        <p className="text-slate-500 text-sm ">
                          No other users yet. Share the app so others can sign
                          up.
                        </p>
                      ) : (
                        <div className="grid gap-2">
                          {users.map((u) => (
                            <button
                              key={u.id}
                              onClick={() => openConversation(u)}
                              disabled={loadingConv}
                              className="flex items-center gap-3 p-3 rounded-[20px]   hover:bg-white border border-[var(--border)] text-left transition"
                            >
                              <div className="relative">
                                <Avatar
                                  name={u.name}
                                  src={u.avatarUrl}
                                  size="md"
                                />
                                {onlineUserIds.has(u.id) && (
                                  <span className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-white" />
                                )}
                              </div>
                              <div>
                                <p className="font-medium text-slate-800">
                                  {u.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {u.email}
                                </p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : selectedConv ? (
                    /* Active conversation */
                    <>
                      {/* Chat header – ~60px, 15–20px padding, 1px border-bottom */}
                      <div className="min-h-[60px]  px-5 py-4 bg-white  flex items-center gap-4">
                        <Avatar
                          name={selectedConv.otherUser.name}
                          src={selectedConv.otherUser.avatarUrl}
                          size="md"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-800">
                            {selectedConv.otherUser.name}
                          </p>
                          <p
                            className={`text-xs ${
                              isChatWithAI
                                ? "text-slate-500"
                                : !connected
                                  ? "text-amber-600"
                                  : onlineUserIds.has(selectedConv.otherUser.id)
                                    ? "text-green-600"
                                    : "text-slate-500"
                            }`}
                          >
                            {isChatWithAI
                              ? "AI Assistant"
                              : !connected
                                ? "Connecting…"
                                : onlineUserIds.has(selectedConv.otherUser.id)
                                  ? "Online"
                                  : "Offline"}
                          </p>
                        </div>
                        <button
                          type="button"
                          className="p-2 rounded-[20px] text-slate-600 hover:bg-slate-100 transition"
                          title="Search"
                        >
                          <SearchIcon size={24} />
                        </button>
                        {!isChatWithAI && (
                          <>
                            <button
                              type="button"
                              className="p-2 rounded-[20px] text-slate-600 hover:bg-slate-100 transition"
                              title="Voice call"
                            >
                              <PhoneIcon size={24} />
                            </button>
                            <button
                              type="button"
                              className="p-2 rounded-[20px] text-slate-600 hover:bg-slate-100 transition"
                              title="Video call"
                            >
                              <VideoCallIcon size={24} />
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setShowRightPanel((v) => !v)}
                          className="p-2 rounded-[20px] text-slate-600 hover:bg-slate-100 transition"
                          title="More options"
                        >
                          <DotsThreeIcon size={24} />
                        </button>
                      </div>

                      {/* Messages + input in one rounded container (same width) */}
                      <div
                        className="flex-1 min-h-0 flex flex-col overflow-hidden w-full min-w-0 border border-[var(--border)] bg-[var(--sidebar-bg)] pl-5 pt-2"
                        style={{ borderRadius: "20px", overflow: "hidden" }}
                      >
                        {/* <div className="flex-1 min-h-0 overflow-y-auto w-full px-5 py-5 min-w-0   bg-white"> */}
                        {messages.length === 0 ? (
                          <>
                            <div className="space-y-3">
                              <div className="flex justify-start">
                                <div className="flex items-end gap-2 max-w-[60%] ">
                                  <Avatar
                                    name={
                                      selectedConv?.otherUser.name ??
                                      "Daniel CH"
                                    }
                                    src={selectedConv?.otherUser.avatarUrl}
                                    size="sm"
                                  />
                                  <div className="flex flex-col items-start">
                                    <div className="rounded-[20px] bg-[var(--bubble-other)] px-3 py-2 border border-[var(--border)]">
                                      <p className="text-sm text-slate-800">
                                        Hey, Dan
                                      </p>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      10:17 AM
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="flex items-end gap-2 max-w-[70%]">
                                  <div className="w-8" />
                                  <div className="flex flex-col items-start">
                                    <div className="rounded-[20px] bg-[var(--bubble-other)] px-3 py-2 border border-[var(--border)]">
                                      <p className="text-sm text-slate-800">
                                        Can you help with the last task for
                                        Eventora, please?
                                      </p>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      10:17 AM
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="flex items-end gap-2 max-w-[70%]">
                                  <div className="w-8" />
                                  <div className="flex flex-col items-start">
                                    <div className="rounded-[20px] bg-[var(--bubble-other)] px-3 py-2 border border-[var(--border)]">
                                      <p className="text-sm text-slate-800">
                                        I'm little bit confused with the task.
                                        😕
                                      </p>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      10:17 AM
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end">
                                <div className="flex items-end gap-2 max-w-[60%] flex-row-reverse">
                                  <div className="flex flex-col items-end">
                                    <div className="rounded-[20px] bg-[var(--bubble-me)] px-3 py-2 text-slate-800 border border-[var(--border)]">
                                      <p className="text-sm">
                                        it's done already, no worries!
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 text-[11px] text-slate-600 mt-0.5">
                                      <CheckDoubleIcon size={12} />
                                      <span>10:22 AM</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="flex items-end gap-2 max-w-[60%]">
                                  <div className="w-8" />
                                  <div className="flex flex-col items-start">
                                    <div className="rounded-[20px] bg-[var(--bubble-other)] px-3 py-2 border border-[var(--border)]">
                                      <p className="text-sm text-slate-800">
                                        what...
                                      </p>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      10:32 AM
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-start">
                                <div className="flex items-end gap-2 max-w-[70%]">
                                  <div className="w-8" />
                                  <div className="flex flex-col items-start">
                                    <div className="rounded-[20px] bg-[var(--bubble-other)] px-3 py-2 border border-[var(--border)]">
                                      <p className="text-sm text-slate-800">
                                        Really?! Thank you so much! 😍
                                      </p>
                                    </div>
                                    <div className="text-[11px] text-slate-400 mt-0.5">
                                      10:32 AM
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="flex justify-end mt-4">
                                <div className="flex items-end gap-2 max-w-[70%] flex-row-reverse">
                                  <div className="flex flex-col items-end">
                                    <div className="rounded-[20px] bg-[var(--bubble-me)] px-3 py-2 text-slate-800 border border-[var(--border)]">
                                      <p className="text-sm">
                                        anytime! my pleasure~
                                      </p>
                                    </div>
                                    <div className="flex items-center justify-end gap-1 text-[11px] text-slate-600 mt-0.5">
                                      <CheckDoubleIcon size={12} />
                                      <span>11:01 AM</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <div className="flex justify-center mt-5 mb-2">
                              <span className="text-[11px] font-medium text-slate-500 bg-white px-3 py-1 rounded-[20px] border border-[var(--border)]">
                                Today
                              </span>
                            </div>
                          </>
                        ) : (
                          <>
                            {messages.map((m) => (
                              <div
                                key={m.id}
                                className={`flex mb-3 ${m.isMe ? "justify-end" : "justify-start"}`}
                              >
                                <div
                                  className={`flex items-end gap-2 max-w-[70%] ${m.isMe ? "flex-row-reverse" : ""}`}
                                >
                                  {!m.isMe &&
                                    (m.sender.id === "__ai__" ? (
                                      <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-[var(--accent)] shrink-0">
                                        <RobotIcon size={22} />
                                      </div>
                                    ) : (
                                      <Avatar
                                        name={m.sender.name}
                                        src={m.sender.avatarUrl}
                                        size="sm"
                                      />
                                    ))}
                                  <div
                                    className={`flex flex-col ${m.isMe ? "items-end" : "items-start"}`}
                                  >
                                    <div
                                      className={`rounded-[20px] px-3 py-2 text-sm leading-relaxed ${
                                        m.isMe
                                          ? "bg-[var(--bubble-me)] text-slate-800 border border-[var(--border)]"
                                          : "bg-[var(--bubble-other)] text-slate-800 border border-[var(--border)]"
                                      }`}
                                    >
                                      <p>{m.content}</p>
                                    </div>
                                    <div
                                      className={`flex items-center gap-1 mt-0.5 text-xs ${m.isMe ? "text-slate-600 justify-end" : "text-slate-400"}`}
                                    >
                                      {m.isMe && (
                                        <span
                                          className="text-slate-600"
                                          title="Read"
                                        >
                                          <CheckDoubleIcon size={12} />
                                        </span>
                                      )}
                                      <span>
                                        {formatTime(m.createdAt).replace(
                                          "Today at ",
                                          "",
                                        )}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                            <div className="flex justify-center mt-5 mb-2">
                              <span className="text-[11px] font-medium text-slate-500 bg-white px-3 py-1 rounded-[20px] border border-[var(--border)]">
                                Today
                              </span>
                            </div>
                          </>
                        )}
                        <div ref={messagesEndRef} />
                      </div>
                      {/* </div> */}

                      {/* Input – same width as messages (sibling in same rounded container) */}
                      <form
                        onSubmit={isChatWithAI ? handleSendAI : handleSend}
                        className="w-full min-w-0 shrink-0 px-3 py-4 bg-white"
                      >
                        <div className="flex items-center gap-2 w-full min-w-0 rounded-[20px] bg-white border border-[var(--border)] px-2 py-2">
                          <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Type any message..."
                            className="flex-1 min-w-0 py-1.5 pl-1 pr-2 text-slate-800 placeholder-slate-400 focus:outline-none text-sm bg-transparent"
                          />
                          <button
                            type="button"
                            className="p-1.5 rounded-[20px] text-slate-600 hover:bg-slate-100 transition shrink-0"
                            title="Voice message"
                          >
                            <MicrophoneIcon size={20} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-[20px] text-slate-600 hover:bg-slate-100 transition shrink-0"
                            title="Attach file"
                          >
                            <PaperclipIcon size={20} />
                          </button>
                          <button
                            type="button"
                            className="p-1.5 rounded-[20px] text-slate-600 hover:bg-slate-100 transition shrink-0"
                            title="Emoji"
                          >
                            <EmojiIcon size={20} />
                          </button>
                          <button
                            type="submit"
                            disabled={!input.trim()}
                            className="w-9 h-9 rounded-full bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-white flex items-center justify-center transition disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
                            title="Send"
                          >
                            <PaperPlaneIcon size={18} className="text-white" />
                          </button>
                        </div>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-500 px-5 rounded-[20px] bg-white/80 border border-[var(--border)] mx-5 my-5">
                      <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                        <img
                          src="/icons/icon-messages.png"
                          alt=""
                          className="w-10 h-10 object-contain opacity-90"
                          width={40}
                          height={40}
                        />
                      </div>
                      <p className="text-sm font-medium text-slate-600">
                        Select a conversation
                      </p>
                      <p className="text-xs mt-1 text-slate-500">
                        Choose a chat from the list or start a new one
                      </p>
                      <button
                        onClick={() => setShowNewChat(true)}
                        className="mt-4 px-4 py-2 rounded-[20px] bg-[var(--accent)] text-white text-sm font-medium hover:bg-[var(--accent-hover)] transition shadow-sm"
                      >
                        New Chat
                      </button>
                    </div>
                  )}
                </div>
              </main>
            </div>
          </div>
        </div>

        {/* Right sidebar - Contact Info: avatar, name, email, Audio/Video, Media/Link/Docs (overlay card) */}
        {showRightPanel && selectedConv && (
          <aside className="absolute top-24 right-4 sm:right-10 w-[320px] bg-white rounded-[var(--radius-app)] border border-[var(--border)] shadow-[var(--shadow-panel)] flex flex-col z-20">
            <div className="shrink-0 p-5 border-b border-[var(--border)]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-slate-800">Contact Info</h2>
                <button
                  type="button"
                  onClick={() => setShowRightPanel(false)}
                  className="p-1.5 rounded-[var(--radius-app)] text-slate-500 hover:bg-slate-100 transition"
                  aria-label="Close"
                >
                  <CloseIcon size={24} />
                </button>
              </div>
              {isChatWithAI ? (
                <div className="flex flex-col items-center py-4 text-center">
                  <div className="w-20 h-20 rounded-full bg-slate-200 flex items-center justify-center text-[var(--accent)] mb-3">
                    <RobotIcon size={40} />
                  </div>
                  <p className="font-medium text-slate-800">Chat with AI</p>
                  <p className="text-sm text-slate-500 mt-0.5">
                    No contact info for AI.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-col items-center pb-4">
                    <Avatar
                      name={selectedConv.otherUser.name}
                      src={selectedConv.otherUser.avatarUrl}
                      size="xl"
                    />
                    <p className="font-medium text-slate-800 mt-3">
                      {selectedConv.otherUser.name}
                    </p>
                    <p className="text-sm text-slate-500 truncate max-w-full">
                      {selectedConv.otherUser.email || "No email"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-app)] bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-sm font-medium"
                    >
                      <PhoneIcon size={22} />
                      Audio
                    </button>
                    <button
                      type="button"
                      className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-[var(--radius-app)] bg-slate-100 text-slate-700 hover:bg-slate-200 transition text-sm font-medium"
                    >
                      <VideoCallIcon size={22} />
                      Video
                    </button>
                  </div>
                </>
              )}
            </div>
            {!isChatWithAI && (
              <>
                <div className="flex rounded-[var(--radius-app)] bg-slate-100 p-0.5 mx-4 mt-2">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("media")}
                    className={`flex-1 py-2 rounded-[var(--radius-app)] text-xs font-medium transition ${
                      rightPanelTab === "media"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Media
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("link")}
                    className={`flex-1 py-2 rounded-[var(--radius-app)] text-xs font-medium transition ${
                      rightPanelTab === "link"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Link
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("docs")}
                    className={`flex-1 py-2 rounded-[var(--radius-app)] text-xs font-medium transition ${
                      rightPanelTab === "docs"
                        ? "bg-white text-slate-800 shadow-sm"
                        : "text-slate-600"
                    }`}
                  >
                    Docs
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4  rounded-br-[20px] rounded-bl-[20px] rounded-tl-[20] rounded-tr-[20]">
                  {rightPanelTab === "media" && (
                    <div className="space-y-3">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Media
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[1, 2, 3, 4, 5, 6].map((i) => (
                          <div
                            key={i}
                            className="aspect-square rounded-[var(--radius-app)] bg-slate-200 flex items-center justify-center text-slate-400 text-xs"
                            aria-hidden
                          >
                            thumb
                          </div>
                        ))}
                      </div>
                      <p className="text-sm text-slate-500">
                        No media in this chat yet
                      </p>
                    </div>
                  )}
                  {rightPanelTab === "link" && (
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Link
                      </p>
                      <p className="text-sm text-slate-500">No links shared</p>
                    </div>
                  )}
                  {rightPanelTab === "docs" && (
                    <div className="space-y-4">
                      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Docs
                      </p>
                      <section>
                        <p className="text-xs font-medium text-slate-500 mb-2">
                          May
                        </p>
                        <ul className="space-y-3">
                          {[
                            {
                              name: "Document Requirement.pdf",
                              detail: "10 pages • 16 MB",
                              ext: "pdf",
                              icon: "red",
                            },
                            {
                              name: "User Flow.pdf",
                              detail: "7 pages • 32 MB",
                              ext: "pdf",
                              icon: "red",
                            },
                            {
                              name: "Existing App.fig",
                              detail: "213 MB",
                              ext: "fig",
                              icon: "purple",
                            },
                            {
                              name: "Product Illustrations.ai",
                              detail: "72 MB",
                              ext: "ai",
                              icon: "orange",
                            },
                            {
                              name: "Quotation-Hikariworks-May.pdf",
                              detail: "2 pages • 329 KB",
                              ext: "pdf",
                              icon: "red",
                            },
                          ].map((f, i) => (
                            <li
                              key={i}
                              className="flex items-start gap-3 group"
                            >
                              <div
                                className={`w-9 h-9 rounded-[var(--radius-app)] shrink-0 flex items-center justify-center text-white text-xs font-medium ${
                                  f.icon === "red"
                                    ? "bg-red-500"
                                    : f.icon === "purple"
                                      ? "bg-purple-500"
                                      : "bg-amber-500"
                                }`}
                              >
                                {f.ext.toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-slate-800 truncate">
                                  {f.name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {f.detail}
                                </p>
                              </div>
                              <span className="text-xs text-slate-400 shrink-0">
                                {f.ext}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </section>
                    </div>
                  )}
                </div>
              </>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}
