import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useUser } from "@clerk/clerk-react";
import { clearChat, fetchChats, fetchMessages } from "../services/chatApi";

interface Message {
  _id?: string;
  role: "user" | "assistant";
  content: string;
}

interface Chat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

interface ChatListResponse {
  chats?: Chat[];
}

interface StreamEvent {
  type: "meta" | "chunk" | "done" | "error";
  chatId?: string;
  content?: string;
  error?: string;
}

const readSseFrames = (buffer: string) => {
  const frames = buffer.split(/\r?\n\r?\n/);
  const remaining = frames.pop() ?? "";
  const payloads = frames
    .map((frame) => {
      const dataLines = frame
        .split(/\r?\n/)
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.replace(/^data:\s?/, ""));

      if (dataLines.length === 0) {
        return "";
      }

      return dataLines.join("\n");
    })
    .filter(Boolean);

  return { payloads, remaining };
};

interface ChatContextType {
  booting: boolean;
  chatId: string | null;
  chats: Chat[];
  error: string;
  loading: boolean;
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  prompt: string;
  streamingMessageId: string | null;
  userId: string;
  selectedModel: string;

  setSelectedModel: (model: string) => void;
  resetChat: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  setPrompt: (prompt: string) => void;
  submitMessage: () => Promise<void>;
  createNewChat: () => void;
  deleteChat: (chatId: string) => Promise<void>;
  loadChats: () => Promise<ChatListResponse>;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, isLoaded } = useUser();

  const [messages, setMessages] = useState<Message[]>([]);
  const [chats, setChats] = useState<Chat[]>([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [chatId, setChatId] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [selectedModel, setSelectedModel] = useState("gemini");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const pendingAssistantChunkRef = useRef("");
  const userId = user?.id ?? "";
  const updateAssistantMessage = (
    targetMessageId: string,
    nextChunk: string,
  ) => {
    setMessages((currentMessages) =>
      currentMessages.map((message) =>
        message._id === targetMessageId
          ? { ...message, content: message.content + nextChunk }
          : message,
      ),
    );
  };

  const queueAssistantChunk = (nextChunk: string) => {
    pendingAssistantChunkRef.current += nextChunk;
  };

  useEffect(() => {
    if (!streamingMessageId) return;

    let timeoutId: number;

    const type = () => {
      const pending = pendingAssistantChunkRef.current;
      if (pending.length > 0) {
        // Calculate how many characters to type in this tick
        // Faster if the queue is backing up
        const totalPending = pending.length;
        let charsToAdd = 1;

        if (totalPending > 200) charsToAdd = 20;
        else if (totalPending > 100) charsToAdd = 10;
        else if (totalPending > 50) charsToAdd = 5;
        else if (totalPending > 20) charsToAdd = 2;

        const toDisplay = pending.slice(0, charsToAdd);
        pendingAssistantChunkRef.current = pending.slice(charsToAdd);

        updateAssistantMessage(streamingMessageId, toDisplay);

        // Schedule next character
        timeoutId = window.setTimeout(type, 16); // ~60fps target
      } else {
        if (!loading) {
          // If we finished the network stream AND the queue is empty
          setStreamingMessageId(null);
        } else {
          // Network still going but queue empty, wait/poll
          timeoutId = window.setTimeout(type, 30);
        }
      }
    };

    type();
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [streamingMessageId, loading]);

  const removeMessageById = (targetMessageId: string) => {
    setMessages((currentMessages) =>
      currentMessages.filter((message) => message._id !== targetMessageId),
    );
  };

  const loadChats = async () => {
    try {
      const data = await fetchChats(userId);
      setChats(data.chats || []);
      return data as ChatListResponse;
    } catch (err) {
      console.error("Failed to load chats:", err);
      return { chats: [] } as ChatListResponse;
    }
  };

  const loadMessages = async (cid: string | null) => {
    try {
      setError("");
      const data = await fetchMessages(userId, cid);
      setMessages(data.messages ?? []);
      if (data.chatId) setChatId(data.chatId);
    } catch (err: any) {
      setError(err.message || "Could not connect to backend");
    } finally {
      setBooting(false);
    }
  };

  useEffect(() => {
    const userId = user?.id;
    if (!isLoaded || !userId) return;

    loadMessages(chatId);
    loadChats();
  }, [isLoaded, user?.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: loading ? "auto" : "smooth",
    });
  }, [messages, loading]);

  const selectChat = async (selectedChatId: string) => {
    if (loading) return;
    setChatId(selectedChatId);
    await loadMessages(selectedChatId);
  };

  const submitMessage = async () => {
    const trimmed = prompt.trim();
    if (!trimmed || loading) return;

    setPrompt("");
    setLoading(true);
    setError("");

    const userMessage: Message = {
      role: "user",
      content: trimmed,
      _id: `u-${Date.now()}`,
    };

    const assistantMessage: Message = {
      role: "assistant",
      content: "",
      _id: `a-${Date.now()}`,
    };
    const assistantMessageId = assistantMessage._id as string;
    let resolvedChatId = chatId;

    setStreamingMessageId(assistantMessageId);
    pendingAssistantChunkRef.current = "";

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          Accept: "text/event-stream",
          "Content-Type": "application/json",
          "x-user-id": userId,
        },
        body: JSON.stringify({
          message: trimmed,
          chatId,
          model: selectedModel,
        }),
      });

      if (!response.ok || !response.body) {
        const errorText = await response.text();

        try {
          const parsedError = JSON.parse(errorText) as { error?: string };
          throw new Error(
            parsedError.error || "Network error or empty response",
          );
        } catch {
          throw new Error(errorText || "Network error or empty response");
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamBuffer = "";

      const handlePayload = (payload: string) => {
        let parsed: StreamEvent;

        try {
          parsed = JSON.parse(payload) as StreamEvent;
        } catch {
          const cleanedPayload = payload.replace(/^data:\s?/gm, "");
          if (cleanedPayload) {
            queueAssistantChunk(cleanedPayload);
          }
          return;
        }

        if (parsed.type === "meta" && parsed.chatId) {
          resolvedChatId = parsed.chatId;
          setChatId(parsed.chatId);
          return;
        }

        if (parsed.type === "chunk" && parsed.content) {
          queueAssistantChunk(parsed.content);
          return;
        }

        if (parsed.type === "done" && parsed.chatId) {
          resolvedChatId = parsed.chatId;
          setChatId(parsed.chatId);
          return;
        }

        if (parsed.type === "error") {
          throw new Error(parsed.error || "Streaming failed");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        streamBuffer += decoder.decode(value, { stream: true });

        const { payloads, remaining } = readSseFrames(streamBuffer);
        streamBuffer = remaining;

        for (const payload of payloads) {
          handlePayload(payload);
        }
      }

      streamBuffer += decoder.decode();
      const { payloads: trailingPayloads } = readSseFrames(
        `${streamBuffer}\n\n`,
      );
      for (const payload of trailingPayloads) {
        handlePayload(payload);
      }

      await loadChats();

      if (resolvedChatId) {
        setChatId(resolvedChatId);
      }
    } catch (err: any) {
      if (!pendingAssistantChunkRef.current) {
        removeMessageById(assistantMessageId);
      }

      setError(err.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const resetChat = async () => {
    try {
      await clearChat(userId, chatId);
      setMessages([]);
      setChatId(null);
      await loadChats();
    } catch (err: any) {
      setError(err.message || "Failed to clear chat");
    }
  };

  const createNewChat = () => {
    setChatId(null);
    setMessages([]);
    setPrompt("");
    setError("");
  };

  const deleteChat = async (chatIdToDelete: string) => {
    try {
      await clearChat(userId, chatIdToDelete);

      if (chatId === chatIdToDelete) {
        setChatId(null);
        setMessages([]);
      }

      await loadChats();
    } catch (err: any) {
      setError(err.message || "Failed to delete chat");
    }
  };

  return (
    <ChatContext.Provider
      value={{
        booting,
        chatId,
        chats,
        error,
        loading,
        messages,
        messagesEndRef,
        prompt,
        streamingMessageId,
        userId,
        selectedModel,
        setSelectedModel,
        resetChat,
        selectChat,
        setPrompt,
        submitMessage,
        createNewChat,
        deleteChat,
        loadChats,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};
