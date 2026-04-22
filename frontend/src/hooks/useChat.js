import { useEffect, useRef, useState } from "react";
import {
  clearChat,
  fetchChats,
  fetchMessages,
  sendChatMessage,
} from "../services/chatApi";
import { getOrCreateUserId } from "../utils/user";

export const useChat = () => {
  const [messages, setMessages] = useState([]);
  const [chats, setChats] = useState([]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [booting, setBooting] = useState(true);
  const [error, setError] = useState("");
  const [userId] = useState(getOrCreateUserId);
  const [chatId, setChatId] = useState(null);
  const messagesEndRef = useRef(null);

  const loadChats = async () => {
    try {
      const data = await fetchChats(userId);
      setChats(data.chats || []);
    } catch (error) {
      console.error("Failed to load chats:", error);
    }
  };

  useEffect(() => {
    const loadMessages = async () => {
      try {
        setError("");
        const data = await fetchMessages(userId, chatId);
        setMessages(data.messages ?? []);
        // If we're fetching a specific chat, ensure we have its ID
        if (data.chatId) {
          setChatId(data.chatId);
        }
      } catch (requestError) {
        setError(requestError.message || "Could not connect to the backend");
      } finally {
        setBooting(false);
      }
    };

    loadMessages();
    loadChats();
  }, [userId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const selectChat = async (selectedChatId) => {
    if (loading) return;

    try {
      setError("");
      setChatId(selectedChatId);
      const data = await fetchMessages(userId, selectedChatId);
      setMessages(data.messages ?? []);
    } catch (error) {
      setError("Failed to load chat");
    }
  };

  const submitMessage = async () => {
    const trimmedPrompt = prompt.trim();

    if (!trimmedPrompt || loading) {
      return;
    }

    const optimisticMessage = {
      role: "user",
      content: trimmedPrompt,
      _id: `temp-${Date.now()}`,
    };

    setMessages((currentMessages) => [...currentMessages, optimisticMessage]);
    setPrompt("");
    setLoading(true);
    setError("");

    try {
      const data = await sendChatMessage(userId, trimmedPrompt, chatId);

      // Update chat ID if it's a new chat
      if (data.chatId && !chatId) {
        setChatId(data.chatId);
        await loadChats(); // Refresh chat list
      }

      // Fetch updated messages from server to ensure consistency
      const updatedData = await fetchMessages(userId, data.chatId || chatId);
      setMessages(updatedData.messages ?? []);
    } catch (requestError) {
      setMessages((currentMessages) =>
        currentMessages.filter(
          (message) => message._id !== optimisticMessage._id,
        ),
      );
      setPrompt(trimmedPrompt);
      setError(requestError.message || "Failed to send message");
    } finally {
      setLoading(false);
    }
  };

  const resetChat = async () => {
    if (loading) {
      return;
    }

    try {
      setError("");
      await clearChat(userId, chatId);
      setMessages([]);
      setChatId(null);
      await loadChats(); // Refresh chat list
    } catch (requestError) {
      setError(requestError.message || "Failed to clear chat");
    }
  };

  const createNewChat = () => {
    setChatId(null);
    setMessages([]);
    setPrompt("");
    setError("");
  };

  return {
    booting,
    chatId,
    chats,
    error,
    loading,
    messages,
    messagesEndRef,
    prompt,
    resetChat,
    selectChat,
    setPrompt,
    submitMessage,
    userId,
    createNewChat,
  };
};
