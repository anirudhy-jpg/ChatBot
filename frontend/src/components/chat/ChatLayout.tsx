import { useEffect, useState } from "react";
import { UserButton, useClerk, useUser } from "@clerk/clerk-react";
import { useChatContext } from "../../contexts/ChatContext";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { FaUser } from "react-icons/fa";
import { HiOutlineSparkles } from "react-icons/hi";
import type { FormEvent, KeyboardEvent } from "react";

interface Message {
  _id?: string;
  role: "user" | "assistant";
  content: string;
}

const StreamingCursor = ({ theme }: { theme: "light" | "dark" }) => (
  <span
    aria-hidden="true"
    className={`ml-1 inline-block h-5 w-2 animate-pulse rounded-sm align-[-0.2em] ${
      theme === "dark" ? "bg-slate-300" : "bg-slate-500"
    }`}
  />
);

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await submitMessage();
  };

  const [theme, setTheme] = useState<"light" | "dark">("light");

  const handleKeyDown = async (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      await submitMessage();
    }
  };

  useEffect(() => {
    const savedTheme = localStorage.getItem("chatbot-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      setTheme(savedTheme);
      return;
    }

    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem("chatbot-theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const displayName =
    user?.fullName || user?.primaryEmailAddress?.emailAddress || "User";

  return (
    <div
      className={`h-screen overflow-hidden ${
        theme === "dark"
          ? "bg-slate-950 text-slate-100"
          : "bg-slate-50 text-slate-900"
      }`}
    >
      <div className="grid h-full grid-cols-1 min-h-0  lg:grid-cols-[260px_minmax(0,1fr)]">
        {/* Sidebar */}
        <aside
          className={`hidden h-full min-h-0 flex-col lg:flex border-r ${
            theme === "dark"
              ? "border-slate-700 bg-slate-900 text-slate-200"
              : "border-slate-200 bg-white text-slate-800"
          }`}
        >
          <div className="p-3">
            <button
              onClick={createNewChat}
              className={`w-full rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${
                theme === "dark"
                  ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                  : "border-slate-200 bg-white text-slate-900 hover:bg-indigo-50"
              }`}
            >
              + New Chat
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="px-3 py-2">
              <h3
                className={`text-[11px] font-semibold uppercase tracking-widest mb-2 ${
                  theme === "dark" ? "text-slate-400" : "text-slate-400"
                }`}
              ></h3>

              <div className="space-y-1">
                {chats.map((chat) => (
                  <div
                    key={chat.id}
                    className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-[13px] transition ${
                      chatId === chat.id
                        ? theme === "dark"
                          ? "bg-indigo-900 text-indigo-100"
                          : "bg-indigo-100 text-indigo-700"
                        : theme === "dark"
                          ? "hover:bg-slate-800"
                          : "hover:bg-indigo-50"
                    }`}
                  >
                    <button
                      onClick={() => selectChat(chat.id)}
                      className="flex-1 text-left"
                    >
                      <div className="truncate">{chat.title}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(chat.updatedAt).toLocaleDateString()}
                      </div>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteChat(chat.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-red-500 transition-all p-1"
                      title="Delete chat"
                    >
                      <svg
                        width="16"
                        height="16"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M3 6h18"></path>
                        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path>
                        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="px-3 pb-3">
            <div
              className={`rounded-xl p-2 text-xs ${
                theme === "dark"
                  ? "bg-slate-800 text-slate-200"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              <div className="flex items-center gap-2">
                <UserButton
                  appearance={{ elements: { avatarBox: "h-8 w-8" } }}
                />
                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate text-[13px] font-semibold ${
                      theme === "dark" ? "text-slate-100" : "text-slate-800"
                    }`}
                  >
                    {displayName}
                  </p>
                  <p
                    className={`text-[11px] break-all font-mono ${
                      theme === "dark" ? "text-slate-300" : "text-slate-500"
                    }`}
                  >
                    {userId}
                  </p>
                </div>
              </div>

              <button
                onClick={() => signOut()}
                className={`mt-2 w-full rounded-lg border px-2 py-1.5 text-[12px] font-medium transition ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900 text-slate-100 hover:bg-slate-800"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </aside>

        {/* Main */}
        <main className="flex min-h-0 flex-col">
          <header
            className={`flex items-center justify-between border-b px-4 py-3 ${
              theme === "dark"
                ? "border-slate-700 bg-slate-900"
                : "border-slate-200 bg-white"
            }`}
          >
            <h2 className="text-base font-semibold">ChatBot</h2>
            <div className="flex items-center gap-3">
              <div
                className={`text-[12px] ${
                  theme === "dark" ? "text-slate-400" : "text-slate-500"
                }`}
              >
                {booting ? "Connecting..." : "Connected"}
              </div>
              <button
                onClick={toggleTheme}
                className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-800 text-slate-100 hover:bg-slate-700"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {theme === "dark" ? "Light" : "Dark"} Mode
              </button>
            </div>
          </header>

          {/* Messages */}
          <section className="flex-1 min-h-0  overflow-y-auto">
            <div className="w-full max-w-3xl mx-auto px-2 py-5">
              {booting ? (
                <div className="flex justify-center text-slate-500 text-sm">
                  Loading...
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center text-center">
                  <h3 className="text-lg font-semibold">
                    How can I help today?
                  </h3>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {messages.map((message: Message, index: number) =>
                    (() => {
                      const isStreamingAssistant =
                        message.role === "assistant" &&
                        message._id === streamingMessageId;

                      return (
                        <div
                          key={message._id || index}
                          className={`flex items-start gap-2 ${
                            message.role === "user"
                              ? "justify-end"
                              : "justify-start"
                          }`}
                        >
                          {/* AI Avatar (unchanged) */}
                          {message.role === "assistant" && (
                            <div className="w-7 h-7 rounded-full bg-indigo-500 flex items-center justify-center text-white">
                              <HiOutlineSparkles size={14} />
                            </div>
                          )}

                          {/* Message */}
                          <div
                            className={`relative group ${
                              message.role === "user"
                                ? "max-w-[70%] rounded-lg bg-indigo-600 px-3 py-2 text-white shadow-sm"
                                : theme === "dark"
                                  ? "inline-block max-w-[min(88%,52rem)] rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-slate-100 shadow-sm"
                                  : "inline-block max-w-[min(88%,52rem)] rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 shadow-sm"
                            }`}
                          >
                            {message.role === "assistant" ? (
                              <>
                                <div className="min-w-0 overflow-hidden">
                                  <MarkdownRenderer content={message.content} />
                                  {isStreamingAssistant && (
                                    <StreamingCursor theme={theme} />
                                  )}
                                </div>
                              </>
                            ) : (
                              <p className="text-[13px] leading-5 whitespace-pre-wrap">
                                {message.content}
                              </p>
                            )}
                          </div>

                          {/* User Avatar (unchanged) */}
                          {message.role === "user" && (
                            <div className="w-7 h-7 rounded-full bg-slate-300 flex items-center justify-center text-slate-700">
                              <FaUser size={12} />
                            </div>
                          )}
                        </div>
                      );
                    })(),
                  )}
                </div>
              )}

              {(loading || streamingMessageId) && (
                <div
                  className={`mt-3 text-[13px] animate-pulse ${
                    theme === "dark" ? "text-slate-300" : "text-slate-500"
                  }`}
                >
                  ChatBot is typing...
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </section>

          {/* Input */}
          <div
            className={`border-t px-3 py-3 ${
              theme === "dark"
                ? "bg-slate-950 border-slate-700"
                : "bg-white border-slate-200"
            }`}
          >
            <form onSubmit={handleSubmit} className="mx-auto max-w-2xl">
              <div
                className={`flex items-end gap-2 rounded-xl border px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 ${
                  theme === "dark"
                    ? "border-slate-700 bg-slate-900"
                    : "border-slate-200 bg-white"
                }`}
              >
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Message ChatBot..."
                  className="flex-1 resize-none bg-transparent outline-none text-[13px] min-h-9 max-h-40"
                  rows={1}
                />

                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className={`px-2 py-1 rounded border text-[12px] ${
                    theme === "dark"
                      ? "border-slate-600 bg-slate-800 text-slate-200"
                      : "border-slate-300 bg-white text-slate-700"
                  }`}
                >
                  <option value="gemini">Gemini</option>
                  <option value="openai">OpenAI</option>
                </select>

                <button
                  type="submit"
                  disabled={loading || !prompt.trim()}
                  className="flex items-center justify-center w-9 h-9 rounded-full 
                  bg-linear-to-r from-indigo-500 to-indigo-600 
                  text-white transition-all duration-200 
                  hover:from-indigo-600 hover:to-indigo-700 
                  disabled:opacity-40 disabled:cursor-not-allowed 
                  active:scale-95"
                >
                  ➤
                </button>
              </div>
            </form>

            {error && (
              <p className="mt-2 text-[13px] text-red-500 text-center">
                {error}
              </p>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};
