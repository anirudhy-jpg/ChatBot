import { Request, Response } from "express";
import { createMessageSchema } from "./chat.validation";
import { getAIService } from "../../services/aiFactory";
import { Chat } from "./chat.model";

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId as string;

    const chat = await Chat.findOne({ userId })
      .sort({ createdAt: -1 })
      .lean();

    const messages = chat?.messages ?? [];
    const chatId = chat?._id ?? null;

    res.json({ messages, chatId });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch chat history",
    });
  }
};

export const getChatHistoryById = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId as string;
    const { chatId } = req.params;

    const chat = await Chat.findById(chatId).lean();

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.userId !== userId) {
      return res.status(403).json({ error: "Unauthorized access to this chat" });
    }

    res.json({ messages: chat.messages, chatId: chat._id });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch chat history",
    });
  }
};

export const getAllChats = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId as string;

    const chats = await Chat.find({ userId })
      .sort({ updatedAt: -1 })
      .select("_id title createdAt updatedAt messages")
      .lean();

    const chatList = chats.map((chat) => ({
      id: chat._id,
      title:
        chat.title ||
        chat.messages[0]?.content?.slice(0, 30) + "..." ||
        "New Chat",
      createdAt: chat.createdAt,
      updatedAt: chat.updatedAt,
      messageCount: chat.messages.length,
    }));

    res.json({ chats: chatList });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to fetch chat list",
    });
  }
};

export const sendMessage = async (req: Request, res: Response) => {
  const validation = createMessageSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      error: validation.error.issues.map((issue) => issue.message).join(", "),
    });
  }

  try {
    const { message, chatId, model } = validation.data;
    const userId = res.locals.userId as string;

    let chat = chatId ? await Chat.findById(chatId) : null;

    if (!chat) {
      chat = await Chat.create({
        userId,
        title: message.slice(0, 20),
        messages: [],
      });
    }

    // Add user message
    chat.messages.push({ role: "user", content: message });

    const formattedMessages = chat.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get AI (Gemini or OpenAI)
    const ai = getAIService(model || "gemini");

    // 🔥 STREAMING HEADERS
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let fullResponse = "";

    // 🔥 STREAM FROM AI
    await ai.streamResponse(formattedMessages, (chunk: string) => {
      fullResponse += chunk;
      res.write(`data: ${chunk}\n\n`);
    });

    // Save final response
    chat.messages.push({
      role: "assistant",
      content: fullResponse,
    });

    await chat.save();

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (error: any) {
    console.error("sendMessage error:", error);

    res.status(500).json({
      error: error.message || "Failed to send message",
    });
  }
};

export const clearMessages = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId as string;
    const { chatId } = req.params;

    if (chatId) {
      const chat = await Chat.findById(chatId);

      if (!chat || chat.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await Chat.findByIdAndDelete(chatId);
    } else {
      await Chat.deleteMany({ userId });
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to clear chat history",
    });
  }
};