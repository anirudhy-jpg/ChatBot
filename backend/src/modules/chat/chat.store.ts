import mongoose from "mongoose";
import { Chat } from "./chat.model";

type ChatRole = "user" | "assistant";

type ChatMessage = {
  role: ChatRole;
  content: string;
  _id?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

type ChatRecord = {
  _id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
};

type ChatListItem = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  messageCount: number;
};

const memoryChats = new Map<string, ChatRecord>();

const isMongoConnected = () => mongoose.connection.readyState === 1;

const makeId = () => new mongoose.Types.ObjectId().toString();

const cloneMessage = (message: ChatMessage): ChatMessage => ({
  ...message,
  createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
  updatedAt: message.updatedAt ? new Date(message.updatedAt) : undefined,
});

const cloneChat = (chat: ChatRecord): ChatRecord => ({
  ...chat,
  createdAt: new Date(chat.createdAt),
  updatedAt: new Date(chat.updatedAt),
  messages: chat.messages.map(cloneMessage),
});

const toMemoryChat = (chat: any): ChatRecord => ({
  _id: String(chat._id),
  userId: chat.userId,
  title: chat.title ?? "",
  createdAt: new Date(chat.createdAt ?? Date.now()),
  updatedAt: new Date(chat.updatedAt ?? Date.now()),
  messages: (chat.messages ?? []).map((message: any) => ({
    _id: message._id ? String(message._id) : undefined,
    role: message.role,
    content: message.content,
    createdAt: message.createdAt ? new Date(message.createdAt) : undefined,
    updatedAt: message.updatedAt ? new Date(message.updatedAt) : undefined,
  })),
});

const getSortedMemoryChats = (userId: string) =>
  Array.from(memoryChats.values())
    .filter((chat) => chat.userId === userId)
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

export const findLatestChatByUserId = async (userId: string) => {
  if (isMongoConnected()) {
    const chat = await Chat.findOne({ userId }).sort({ createdAt: -1 }).lean();
    return chat ? toMemoryChat(chat) : null;
  }

  return getSortedMemoryChats(userId)[0] ?? null;
};

export const findChatById = async (chatId: string) => {
  if (isMongoConnected()) {
    const chat = await Chat.findById(chatId).lean();
    return chat ? toMemoryChat(chat) : null;
  }

  const chat = memoryChats.get(chatId);
  return chat ? cloneChat(chat) : null;
};

export const listChatsByUserId = async (userId: string): Promise<ChatListItem[]> => {
  if (isMongoConnected()) {
    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt updatedAt messages")
      .lean();

    return chats.map((chat: any) => ({
      id: String(chat._id),
      title:
        chat.title || chat.messages[0]?.content?.slice(0, 30) + "..." || "New Chat",
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
    }));
  }

  return getSortedMemoryChats(userId).map((chat) => ({
    id: chat._id,
    title: chat.title || chat.messages[0]?.content?.slice(0, 30) + "..." || "New Chat",
    createdAt: chat.createdAt,
    updatedAt: chat.updatedAt,
    messageCount: chat.messages.length,
  }));
};

export const createChat = async (userId: string, title: string) => {
  if (isMongoConnected()) {
    const chat = await Chat.create({
      userId,
      title,
      messages: [],
    });

    return toMemoryChat(chat.toObject());
  }

  const now = new Date();
  const chat: ChatRecord = {
    _id: makeId(),
    userId,
    title,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };

  memoryChats.set(chat._id, cloneChat(chat));
  return cloneChat(chat);
};

export const appendMessageToChat = async (
  chatId: string,
  message: { role: ChatRole; content: string },
) => {
  if (isMongoConnected()) {
    const chat = await Chat.findById(chatId);

    if (!chat) {
      return null;
    }

    chat.messages.push(message);
    await chat.save();
    return toMemoryChat(chat.toObject());
  }

  const chat = memoryChats.get(chatId);

  if (!chat) {
    return null;
  }

  const now = new Date();
  chat.messages.push({
    _id: makeId(),
    ...message,
    createdAt: now,
    updatedAt: now,
  });
  chat.updatedAt = now;
  memoryChats.set(chatId, cloneChat(chat));
  return cloneChat(chat);
};

export const deleteChatById = async (chatId: string) => {
  if (isMongoConnected()) {
    await Chat.findByIdAndDelete(chatId);
    return;
  }

  memoryChats.delete(chatId);
};

export const deleteChatsByUserId = async (userId: string) => {
  if (isMongoConnected()) {
    await Chat.deleteMany({ userId });
    return;
  }

  for (const [chatId, chat] of memoryChats.entries()) {
    if (chat.userId === userId) {
      memoryChats.delete(chatId);
    }
  }
};
