import { z } from "zod";

export const createMessageSchema = z.object({
  message: z.string().min(1, "Message is required"),
  chatId: z.string().optional().nullable(),
  model: z.enum(["gemini", "openai"]).optional().default("gemini"),
});
