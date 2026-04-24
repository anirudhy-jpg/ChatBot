import { Request, Response } from "express";
import { createMessageSchema } from "./chat.validation";
import { getAIService } from "../../services/aiFactory";
import {
  appendMessageToChat,
  createChat,
  deleteChatById,
  deleteChatsByUserId,
  findChatById,
  findLatestChatByUserId,
  listChatsByUserId,
} from "./chat.store";

const writeSseEvent = (res: Response, payload: Record<string, unknown>) => {
  res.write(`data: ${JSON.stringify(payload)}\n\n`);
};

export const getMessages = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId as string;
    const chat = await findLatestChatByUserId(userId);

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
    const chatId = String(req.params.chatId);

    const chat = await findChatById(chatId);

    if (!chat) {
      return res.status(404).json({ error: "Chat not found" });
    }

    if (chat.userId !== userId) {
      return res
        .status(403)
        .json({ error: "Unauthorized access to this chat" });
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
    const chatList = await listChatsByUserId(userId);

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

    let chat = chatId ? await findChatById(chatId) : null;

    if (!chat) {
      chat = await createChat(userId, message.slice(0, 20));
    }

    // Persist the user turn before streaming so chat state stays consistent
    // even if the provider stream fails midway through.
    chat = await appendMessageToChat(String(chat._id), {
      role: "user",
      content: message,
    });

    if (!chat) {
      throw new Error("Chat not found");
    }

    const formattedMessages = chat.messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    // Get AI (Gemini or OpenAI)
    const ai = getAIService(model || "nvidia");

    // 🔥 STREAMING HEADERS
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders?.();
    req.socket.setNoDelay(true);

    let fullResponse = "";
    let clientClosed = false;

    req.on("close", () => {
      clientClosed = true;
    });

    writeSseEvent(res, { type: "meta", chatId: String(chat._id) });

    try {
      // Stream chunks to the client as they arrive.
      await ai.streamResponse(formattedMessages, (chunk: string) => {
        if (clientClosed || res.writableEnded) {
          return;
        }

        fullResponse += chunk;
        writeSseEvent(res, { type: "chunk", content: chunk });
      });

      if (clientClosed || res.writableEnded) {
        return;
      }

      chat = await appendMessageToChat(String(chat._id), {
        role: "assistant",
        content: fullResponse,
      });

      if (!chat) {
        throw new Error("Failed to save assistant response");
      }

      writeSseEvent(res, { type: "done", chatId: String(chat._id) });
      res.end();
    } catch (streamError: any) {
      console.error("Streaming error:", streamError);

      if (!clientClosed && !res.writableEnded) {
        writeSseEvent(res, {
          type: "error",
          error: streamError.message || "Streaming failed",
        });
      }

      res.end();
    }
  } catch (error: any) {
    console.error("sendMessage error:", error);

    if (res.headersSent) {
      if (!res.writableEnded) {
        writeSseEvent(res, {
          type: "error",
          error: error.message || "Failed to send message",
        });
      }

      res.end();
      return;
    }

    res.status(500).json({
      error: error.message || "Failed to send message",
    });
  }
};

export const clearMessages = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.userId as string;
    const chatId = String(req.params.chatId);

    if (chatId) {
      const chat = await findChatById(chatId);

      if (!chat || chat.userId !== userId) {
        return res.status(403).json({ error: "Unauthorized" });
      }

      await deleteChatById(chatId);
    } else {
      await deleteChatsByUserId(userId);
    }

    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({
      error: error.message || "Failed to clear chat history",
    });
  }
};
