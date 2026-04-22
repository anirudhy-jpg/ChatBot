import { Router } from "express";
import {
  clearMessages,
  getAllChats,
  getMessages,
  getChatHistoryById,
  sendMessage,
} from "./chat.controller";
import { attachUserId } from "../../middlewares/auth.middleware";

const router = Router();

router.use(attachUserId);

// GET /api/chat - get most recent chat
router.get("/", getMessages);

// GET /api/chat/list - get all chats for user
router.get("/list", getAllChats);

// POST /api/chat - send a message
router.post("/", sendMessage);

// GET /api/chat/:chatId - get specific chat history
router.get("/:chatId", getChatHistoryById);

// DELETE /api/chat/:chatId - delete specific chat or all chats
router.delete("/:chatId", clearMessages);

export default router;
