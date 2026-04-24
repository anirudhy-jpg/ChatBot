import React, { useEffect, useRef, useState } from "react";
import { UserButton, useClerk, useUser } from "@clerk/clerk-react";
import { useChatContext } from "../../contexts/ChatContext";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FaUser } from "react-icons/fa";
import { HiOutlineSparkles } from "react-icons/hi";
import type { FormEvent, KeyboardEvent } from "react";

/* ─────────────────────────────────────────────────────── types */
interface Message {
  _id?: string;
  role: "user" | "assistant";
  content: string;
}

/* ─────────────────────────────────────── streaming cursor dot */
const StreamingCursor = ({ theme }: { theme: "light" | "dark" }) => (
  <span
    aria-hidden="true"
    className={`ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm align-[-0.15em] ${
      theme === "dark" ? "bg-indigo-400" : "bg-indigo-500"
    }`}
  />
);

/* ─────────────────────────────────────────── individual bubble */
const ChatMessage = React.memo(
  ({
    message,
    theme,
    isStreaming,
  }: {
    message: Message;
    theme: "light" | "dark";
    isStreaming: boolean;
  }) => {
    const isUser = message.role === "user";
    return (
      <div
        className={`flex items-end gap-2.5 ${isUser ? "justify-end" : "justify-start"}`}
        style={{ animation: "msgIn 0.22s ease" }}
      >
        {/* AI avatar */}
        {!isUser && (
          <div
            className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-white"
            style={{
              background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
              boxShadow: "0 2px 8px rgba(99,102,241,0.4)",
            }}
          >
            <HiOutlineSparkles size={13} />
          </div>
        )}

        {/* Bubble */}
        <div
          className={[
            "relative max-w-[80%] md:max-w-[70%] lg:max-w-[60%] rounded-2xl px-4 py-3 leading-relaxed text-[13.5px] shadow-sm",
            isUser
              ? "rounded-br-sm text-white"
              : theme === "dark"
                ? "rounded-bl-sm border border-white/5 text-slate-100"
                : "rounded-bl-sm border border-slate-100 text-slate-800",
          ].join(" ")}
          style={
            isUser
              ? {
                  background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                }
              : theme === "dark"
                ? { background: "rgba(30,32,44,0.85)", backdropFilter: "blur(8px)" }
                : { background: "rgba(255,255,255,0.92)", backdropFilter: "blur(8px)" }
          }
        >
          {!isUser ? (
            <div className="min-w-0 overflow-hidden">
              <MarkdownRenderer content={message.content} />
              {isStreaming && <StreamingCursor theme={theme} />}
            </div>
          ) : (
            <p className="whitespace-pre-wrap">{message.content}</p>
          )}
        </div>

        {/* User avatar */}
        {isUser && (
          <div
            className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center ${
              theme === "dark"
                ? "bg-slate-600 text-slate-200"
                : "bg-slate-200 text-slate-600"
            }`}
          >
            <FaUser size={11} />
          </div>
        )}
      </div>
    );
  },
);

/* ────────────────────────────────── model badge colours */
const MODEL_META: Record<string, { label: string; color: string }> = {
  nvidia: { label: "NVIDIA", color: "#76b900" },
  gemini: { label: "Gemini", color: "#4285f4" },
  openai: { label: "OpenAI", color: "#10a37f" },
};

/* ──────────────────────────────────── empty state chips */
const STARTER_PROMPTS = [
  "✨ Explain quantum computing simply",
  "🛠️ Fix a React useEffect bug",
  "📝 Draft a professional email",
  "🌍 Translate text to French",
];

/* ══════════════════════════════════════ Main Layout ════════════════════════════════════ */
export const ChatLayout = () => {
  const { signOut } = useClerk();
  const { user } = useUser();

  const {
    booting,
    chatId,
    chats,
    error,
    loading,
    messages,
    messagesEndRef,
    prompt,
    streamingMessageId,
    selectedModel,
    setSelectedModel,
    selectChat,
    setPrompt,
    submitMessage,
    userId,
    createNewChat,
    deleteChat,
  } = useChatContext();

  /* ── state ── */
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* ── theme bootstrap ── */
  useEffect(() => {
    const saved = localStorage.getItem("chatbot-theme");
    if (saved === "dark" || saved === "light") { setTheme(saved); return; }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) setTheme("dark");
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("chatbot-theme", theme);
  }, [theme]);

  /* ── close sidebar on desktop ── */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const handler = (e: MediaQueryListEvent) => { if (e.matches) setSidebarOpen(false); };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  /* ── auto-resize textarea ── */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [prompt]);

  const toggleTheme = () => setTheme(c => c === "dark" ? "light" : "dark");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    await submitMessage();
  };

  const handleKeyDown = async (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); await submitMessage(); }
  };

  const displayName = user?.fullName || user?.primaryEmailAddress?.emailAddress || "User";
  const modelMeta = MODEL_META[selectedModel] ?? { label: selectedModel, color: "#6366f1" };

  /* ── css vars per theme ── */
  const isDark = theme === "dark";
  const bg      = isDark ? "#0d0f17"   : "#f0f2f8";
  const surface = isDark ? "#151722"   : "#ffffff";
  const border  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";
  const muted   = isDark ? "#94a3b8"   : "#64748b";
  const text    = isDark ? "#e2e8f0"   : "#1e293b";

  return (
    <>
      {/* ── keyframe injection ── */}
      <style>{`
        @keyframes msgIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sidebarSlide {
          from { transform: translateX(-100%); }
          to   { transform: translateX(0); }
        }
        .sidebar-scroll::-webkit-scrollbar { width: 4px; }
        .sidebar-scroll::-webkit-scrollbar-track { background: transparent; }
        .sidebar-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.3); border-radius: 4px; }
        .sidebar-scroll::-webkit-scrollbar-thumb:hover { background: rgba(99,102,241,0.55); }
        .msg-scroll::-webkit-scrollbar { width: 5px; }
        .msg-scroll::-webkit-scrollbar-track { background: transparent; }
        .msg-scroll::-webkit-scrollbar-thumb { background: rgba(99,102,241,0.25); border-radius: 4px; }
        textarea::placeholder { color: ${muted}; }
      `}</style>

      <div
        style={{ background: bg, color: text, height: "100dvh", overflow: "hidden", fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {/* ══ LAYOUT GRID ══ */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gridTemplateRows: "1fr", height: "100%", position: "relative" }}>

          {/* ───────────────── SIDEBAR (mobile: overlay, desktop: static) ─────────────────── */}
          {/* Mobile backdrop */}
          {sidebarOpen && (
            <div
              style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", backdropFilter: "blur(2px)", zIndex: 40 }}
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <aside
            style={{
              position: "fixed",
              top: 0, left: 0, bottom: 0,
              width: 260,
              background: surface,
              borderRight: `1px solid ${border}`,
              display: "flex",
              flexDirection: "column",
              zIndex: 50,
              transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)",
              transition: "transform 0.28s cubic-bezier(0.4,0,0.2,1)",
              /* Desktop override via media query below */
            }}
            className="chat-sidebar"
          >
            {/* Sidebar header */}
            <div style={{ padding: "16px 12px 10px", borderBottom: `1px solid ${border}`, display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: 10,
                  background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  boxShadow: "0 2px 12px rgba(99,102,241,0.4)",
                }}
              >
                <HiOutlineSparkles size={16} color="white" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>ChatBot AI</span>

              {/* Close on mobile */}
              <button
                onClick={() => setSidebarOpen(false)}
                style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: muted, padding: 4, borderRadius: 6 }}
                className="lg-hide"
                aria-label="Close sidebar"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* New chat */}
            <div style={{ padding: "10px 12px" }}>
              <button
                onClick={() => { createNewChat(); setSidebarOpen(false); }}
                style={{
                  width: "100%", borderRadius: 10, padding: "9px 12px",
                  background: "linear-gradient(135deg,#6366f1,#7c3aed)",
                  color: "white", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  boxShadow: "0 4px 14px rgba(99,102,241,0.35)",
                  transition: "opacity 0.15s, transform 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "0.88"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14"/></svg>
                New Chat
              </button>
            </div>

            {/* Chat list */}
            <div className="sidebar-scroll" style={{ flex: 1, overflowY: "auto", padding: "0 8px" }}>
              {chats.length === 0 ? (
                <p style={{ color: muted, fontSize: 12, textAlign: "center", marginTop: 24, padding: "0 12px" }}>
                  No chats yet. Start a new conversation!
                </p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {chats.map((chat) => {
                    const active = chatId === chat.id;
                    return (
                      <div
                        key={chat.id}
                        style={{
                          display: "flex", alignItems: "center", gap: 4,
                          borderRadius: 10, padding: "8px 8px",
                          background: active
                            ? isDark ? "rgba(99,102,241,0.18)" : "rgba(99,102,241,0.1)"
                            : "transparent",
                          borderLeft: active ? "3px solid #6366f1" : "3px solid transparent",
                          transition: "background 0.15s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                        className="chat-item-row"
                      >
                        <button
                          onClick={() => { selectChat(chat.id); setSidebarOpen(false); }}
                          style={{ flex: 1, textAlign: "left", background: "none", border: "none", cursor: "pointer", color: text, minWidth: 0 }}
                        >
                          <div style={{
                            fontSize: 13, fontWeight: active ? 600 : 400,
                            color: active ? (isDark ? "#a5b4fc" : "#4f46e5") : text,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {chat.title}
                          </div>
                          <div style={{ fontSize: 11, color: muted, marginTop: 2 }}>
                            {new Date(chat.updatedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                          </div>
                        </button>

                        <button
                          onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                          title="Delete chat"
                          style={{
                            background: "none", border: "none", cursor: "pointer",
                            color: muted, padding: 5, borderRadius: 6, opacity: 0,
                            transition: "opacity 0.15s, color 0.15s",
                            flexShrink: 0,
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.color = "#ef4444"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.color = muted; }}
                          className="delete-btn"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* User panel */}
            <div style={{ padding: "10px 12px", borderTop: `1px solid ${border}` }}>
              <div
                style={{
                  borderRadius: 12, padding: "10px",
                  background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)",
                  border: `1px solid ${border}`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <UserButton appearance={{ elements: { avatarBox: "h-8 w-8" } }} />
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0 }}>
                      {displayName}
                    </p>
                    <p style={{ fontSize: 10, color: muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: 0, marginTop: 1, fontFamily: "monospace" }}>
                      {userId}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => signOut()}
                  style={{
                    marginTop: 8, width: "100%", borderRadius: 8, padding: "6px 0",
                    background: "none", border: `1px solid ${border}`,
                    color: muted, fontSize: 12, cursor: "pointer", fontWeight: 500,
                    transition: "background 0.15s, color 0.15s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.05)"; (e.currentTarget as HTMLButtonElement).style.color = text; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = muted; }}
                >
                  Sign out
                </button>
              </div>
            </div>
          </aside>

          {/* ───────────────────────────── MAIN CONTENT ───────────────────────────── */}
          <main
            style={{
              display: "flex", flexDirection: "column", height: "100dvh",
              /* Push content right on desktop to make room for static sidebar */
              transition: "margin-left 0.28s cubic-bezier(0.4,0,0.2,1)",
            }}
            className="chat-main"
          >
            {/* ── Header ── */}
            <header
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "0 16px", height: 56, flexShrink: 0,
                background: surface,
                borderBottom: `1px solid ${border}`,
                backdropFilter: "blur(12px)",
              }}
            >
              {/* Sidebar toggle */}
              <button
                onClick={() => setSidebarOpen(o => !o)}
                aria-label="Toggle sidebar"
                className="lg-hide"
                style={{
                  background: "none", border: "none", cursor: "pointer",
                  color: muted, padding: 6, borderRadius: 8, display: "flex", alignItems: "center",
                  transition: "background 0.15s, color 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"; (e.currentTarget as HTMLButtonElement).style.color = text; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = "none"; (e.currentTarget as HTMLButtonElement).style.color = muted; }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
                </svg>
              </button>

              {/* Brand */}
              <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                <div
                  style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                  }}
                >
                  <HiOutlineSparkles size={13} color="white" />
                </div>
                <span style={{ fontWeight: 700, fontSize: 15, letterSpacing: "-0.3px" }}>ChatBot AI</span>
              </div>

              {/* Spacer */}
              <div style={{ flex: 1 }} />

              {/* Status pill */}
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: muted }}>
                <span
                  style={{
                    width: 7, height: 7, borderRadius: "50%",
                    background: booting ? "#f59e0b" : "#22c55e",
                    boxShadow: booting ? "0 0 6px #f59e0b" : "0 0 6px #22c55e",
                    display: "inline-block",
                  }}
                />
                <span className="status-label">{booting ? "Connecting…" : "Live"}</span>
              </div>

              {/* Model badge */}
              <div
                style={{
                  fontSize: 11, fontWeight: 700, padding: "3px 9px", borderRadius: 20,
                  border: `1.5px solid ${modelMeta.color}30`,
                  color: modelMeta.color,
                  background: `${modelMeta.color}15`,
                  letterSpacing: "0.5px",
                }}
                className="model-badge"
              >
                {modelMeta.label}
              </div>

              {/* Theme toggle */}
              <button
                onClick={toggleTheme}
                aria-label="Toggle theme"
                style={{
                  background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)",
                  border: `1px solid ${border}`,
                  borderRadius: 8, padding: "5px 7px", cursor: "pointer", color: text,
                  display: "flex", alignItems: "center",
                  transition: "background 0.15s",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)"; }}
              >
                {isDark ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                )}
              </button>
            </header>

            {/* ── Messages ── */}
            <section
              className="msg-scroll"
              style={{ flex: 1, overflowY: "auto", minHeight: 0 }}
            >
              <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 16px 16px" }}>

                {booting ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12, marginTop: 80, color: muted }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      border: "3px solid transparent",
                      borderTopColor: "#6366f1",
                      animation: "spin 0.8s linear infinite",
                    }} />
                    <p style={{ fontSize: 14 }}>Connecting…</p>
                    <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                  </div>
                ) : messages.length === 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", marginTop: 60, gap: 20 }}>
                    <div style={{
                      width: 64, height: 64, borderRadius: 20,
                      background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      boxShadow: "0 8px 28px rgba(99,102,241,0.4)",
                    }}>
                      <HiOutlineSparkles size={30} color="white" />
                    </div>
                    <div>
                      <h2 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px", letterSpacing: "-0.5px" }}>
                        How can I help you today?
                      </h2>
                      <p style={{ color: muted, fontSize: 14, margin: 0 }}>
                        Ask me anything — I'm powered by{" "}
                        <span style={{ color: modelMeta.color, fontWeight: 600 }}>{modelMeta.label}</span>.
                      </p>
                    </div>

                    {/* Starter prompt chips */}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", maxWidth: 580 }}>
                      {STARTER_PROMPTS.map((p) => (
                        <button
                          key={p}
                          onClick={() => setPrompt(p.replace(/^[^\s]+ /, ""))}
                          style={{
                            background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                            border: `1px solid ${border}`,
                            borderRadius: 20, padding: "7px 14px",
                            fontSize: 13, cursor: "pointer", color: text,
                            transition: "background 0.15s, transform 0.15s",
                          }}
                          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(99,102,241,0.15)" : "rgba(99,102,241,0.08)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(-1px)"; }}
                          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)"; (e.currentTarget as HTMLButtonElement).style.transform = "translateY(0)"; }}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {messages.map((message: Message, index: number) => (
                      <ChatMessage
                        key={message._id || index}
                        message={message}
                        theme={theme}
                        isStreaming={message._id === streamingMessageId}
                      />
                    ))}

                    {/* Typing indicator (show only while thinking, hide once streaming starts) */}
                    {loading && !messages.find(m => m._id === streamingMessageId)?.content && (
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{
                          width: 28, height: 28, borderRadius: "50%",
                          background: "linear-gradient(135deg,#6366f1,#8b5cf6)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                        }}>
                          <HiOutlineSparkles size={13} color="white" />
                        </div>
                        <div style={{
                          display: "flex", gap: 4, alignItems: "center",
                          background: isDark ? "rgba(30,32,44,0.85)" : "rgba(255,255,255,0.9)",
                          border: `1px solid ${border}`,
                          borderRadius: "16px 16px 16px 4px", padding: "10px 14px",
                        }}>
                          {[0, 1, 2].map(i => (
                            <span
                              key={i}
                              style={{
                                width: 7, height: 7, borderRadius: "50%",
                                background: "#6366f1",
                                animation: `dotBounce 1.1s ease-in-out ${i * 0.18}s infinite`,
                              }}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                    <style>{`
                      @keyframes dotBounce {
                        0%,80%,100% { transform: scale(0.6); opacity: 0.5; }
                        40% { transform: scale(1); opacity: 1; }
                      }
                    `}</style>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            </section>

            {/* ── Input Bar ── */}
            <div
              style={{
                padding: "12px 16px 16px",
                background: surface,
                borderTop: `1px solid ${border}`,
              }}
            >
              <form onSubmit={handleSubmit} style={{ maxWidth: 760, margin: "0 auto" }}>
                {/* Model selector dropdown */}
                <div style={{ marginBottom: 8, display: "flex", justifyContent: "flex-end" }}>
                  <div style={{ position: "relative", minWidth: 120 }}>
                    <select
                      value={selectedModel}
                      onChange={(e) => setSelectedModel(e.target.value)}
                      style={{
                        width: "100%",
                        appearance: "none",
                        background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
                        border: `1px solid ${border}`,
                        borderRadius: "10px",
                        padding: "6px 32px 6px 12px",
                        fontSize: "12px",
                        fontWeight: "600",
                        color: text,
                        cursor: "pointer",
                        outline: "none",
                        transition: "border-color 0.15s, background 0.15s",
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLSelectElement).style.background = isDark ? "rgba(99,102,241,0.1)" : "rgba(99,102,241,0.06)"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLSelectElement).style.background = isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)"; }}
                    >
                      <option value="nvidia" style={{ background: isDark ? "#1e202c" : "white" }}>NVIDIA NIM</option>
                      <option value="gemini" style={{ background: isDark ? "#1e202c" : "white" }}>Google Gemini</option>
                      <option value="openai" style={{ background: isDark ? "#1e202c" : "white" }}>OpenAI GPT</option>
                    </select>
                    {/* Custom Chevron */}
                    <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: muted, display: "flex" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m6 9 6 6 6-6"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    display: "flex", alignItems: "flex-end", gap: 8,
                    borderRadius: 16, padding: "10px 12px",
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)",
                    border: `1.5px solid ${border}`,
                    transition: "border-color 0.2s, box-shadow 0.2s",
                  }}
                  onFocusCapture={e => {
                    e.currentTarget.style.borderColor = "#6366f1";
                    e.currentTarget.style.boxShadow = "0 0 0 3px rgba(99,102,241,0.15)";
                  }}
                  onBlurCapture={e => {
                    e.currentTarget.style.borderColor = border;
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  <textarea
                    ref={textareaRef}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message ChatBot AI…"
                    rows={1}
                    style={{
                      flex: 1, background: "none", border: "none", outline: "none",
                      resize: "none", fontSize: 14, color: text, lineHeight: 1.55,
                      minHeight: 24, maxHeight: 160, overflowY: "auto",
                      fontFamily: "inherit",
                    }}
                  />


                  {/* Send button */}
                  <button
                    type="submit"
                    disabled={loading || !prompt.trim()}
                    aria-label="Send message"
                    style={{
                      width: 36, height: 36, borderRadius: 10, border: "none",
                      background: loading || !prompt.trim()
                        ? isDark ? "rgba(99,102,241,0.25)" : "rgba(99,102,241,0.2)"
                        : "linear-gradient(135deg,#6366f1,#7c3aed)",
                      color: "white", cursor: loading || !prompt.trim() ? "not-allowed" : "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0,
                      boxShadow: loading || !prompt.trim() ? "none" : "0 4px 12px rgba(99,102,241,0.4)",
                      transition: "opacity 0.15s, transform 0.15s, box-shadow 0.15s",
                    }}
                    onMouseEnter={e => { if (!loading && prompt.trim()) (e.currentTarget as HTMLButtonElement).style.transform = "scale(1.06)"; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)"; }}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
                    </svg>
                  </button>
                </div>

                {error && (
                  <p style={{ marginTop: 8, fontSize: 12.5, color: "#ef4444", textAlign: "center" }}>
                    {error}
                  </p>
                )}
                <p style={{ marginTop: 6, fontSize: 11, color: muted, textAlign: "center" }}>
                  Press Enter to send · Shift+Enter for new line
                </p>
              </form>
            </div>
          </main>
        </div>

        {/* ─────── responsive sidebar (desktop pinned) ─────── */}
        <style>{`
          /* show delete btn on hover */
          .chat-item-row:hover .delete-btn { opacity: 1 !important; }

          /* desktop: pin sidebar, shift main */
          @media (min-width: 1024px) {
            .chat-sidebar {
              transform: translateX(0) !important;
              position: fixed !important;
            }
            .chat-main {
              margin-left: 260px !important;
            }
            .lg-hide { display: none !important; }
          }

          /* hide verbose labels on very small screens */
          @media (max-width: 480px) {
            .status-label { display: none; }
            .model-badge { display: none; }
          }
        `}</style>
      </div>
    </>
  );
};
