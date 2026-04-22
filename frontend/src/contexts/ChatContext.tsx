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

interface ChatContextType {
  booting: boolean;
  chatId: string | null;
  chats: Chat[];
  error: string;
  loading: boolean;
  messages: Message[];
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  prompt: string;
  userId: string;
  selectedModel: string;

  setSelectedModel: (model: string) => void;
  resetChat: () => Promise<void>;
  selectChat: (chatId: string) => Promise<void>;
  setPrompt: (prompt: string) => void;
  submitMessage: () => Promise<void>;
  createNewChat: () => void;
  deleteChat: (chatId: string) => Promise<void>;
  loadChats: () => Promise<void>;
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
  const [selectedModel, setSelectedModel] = useState("gemini");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const userId = user?.id ?? "";

  const loadChats = async () => {
    try {
      const data = await fetchChats(userId);
      setChats(data.chats || []);
    } catch (err) {
      console.error("Failed to load chats:", err);
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
    if (!isLoaded || !userId) return;

    loadMessages(chatId);
    loadChats();
  }, [isLoaded, userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
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

    setMessages((prev) => [...prev, userMessage, assistantMessage]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
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
        throw new Error("Network error or empty response");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let fullText = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;

          const text = line.replace("data: ", "").trim();

          if (text === "[DONE]") continue;

          fullText += text;

          setMessages((prev) => {
            const updated = [...prev];
            updated[updated.length - 1] = {
              ...updated[updated.length - 1],
              content: fullText,
            };
            return updated;
          });
        }
      }

      if (!chatId) await loadChats();
    } catch (err: any) {
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
