import { GoogleGenAI } from "@google/genai";
import { AIService, Message } from "./ai.service";

export class GeminiAdapter implements AIService {
  private ai: GoogleGenAI | null;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY?.trim();
    this.ai = apiKey ? new GoogleGenAI({ apiKey }) : null;
  }

  async generateResponse(messages: Message[]): Promise<string> {
    if (!this.ai) {
      return "Gemini API key not configured.";
    }

    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents,
    });

    return response.text || "gemini response error";
  }

  // 🔥 NEW STREAMING FUNCTION
  async streamResponse(
    messages: Message[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    if (!this.ai) {
      onChunk("Gemini API key not configured.");
      return;
    }

    const contents = messages.map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const stream = await this.ai.models.generateContentStream({
      model: "gemini-2.5-flash-lite",
      contents,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) onChunk(text);
    }
  }
}
