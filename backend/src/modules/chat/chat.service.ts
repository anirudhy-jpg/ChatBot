import mongoose from "mongoose";
import { Chat } from "./chat.model";
import { getAIService } from "../../services/aiFactory";

const memoryChats = new Map<
  string,
  { role: "user" | "assistant"; content: string }[]
>();

const buildAssistantReply = (message: string) => {
  const normalizedMessage = message.trim().toLowerCase();

  if (normalizedMessage.includes("hello") || normalizedMessage.includes("hi")) {
    return "Hello! I am your chat assistant. Ask me anything and I will do my best to help.";
  }

  if (normalizedMessage.includes("who are you")) {
    return "I am your ChatGPT-style demo assistant, connected through your frontend and backend.";
  }

  return `You said: "${message.trim()}". This project is now wired so the frontend sends requests to your backend API and stores the conversation in MongoDB.`;
};

export const getChatMessages = async (userId: string) => {
  if (mongoose.connection.readyState !== 1) {
    return memoryChats.get(userId) ?? [];
  }

  const chat = await Chat.findOne({ userId }).lean();
  return chat?.messages ?? [];
};

// fix path if needed

export const createChatMessage = async (userId: string, message: string) => {
  if (mongoose.connection.readyState !== 1) {
    return "Database not connected";
  }

  let chat = await Chat.findOne({ userId });

  if (!chat) {
    chat = new Chat({ userId, messages: [] });
  }

  // Add user message
  chat.messages.push({
    role: "user",
    content: message,
  });

  // 🔥 Prepare messages for AI
  const formattedMessages = chat.messages.map((msg: any) => ({
    role: msg.role,
    content: msg.content,
  }));

  // 🔥 Get AI response

  // 🔥 AI Response
  const ai = getAIService(process.env.AI_PROVIDER || "gemini");

  const aiReply = await ai.generateResponse(formattedMessages);

  // Save AI response
  chat.messages.push({
    role: "assistant",
    content: aiReply,
  });

  await chat.save();

  return aiReply;
};

export const clearChatMessages = async (userId: string) => {
  if (mongoose.connection.readyState !== 1) {
    memoryChats.set(userId, []);
    return;
  }

  await Chat.findOneAndUpdate(
    { userId },
    { $set: { messages: [] } },
    { returnDocument: "after", upsert: true },
  );
};
