import { GoogleGenAI } from "@google/genai";
import { AIService, Message } from "./ai.service";

const CODE_FORMAT_INSTRUCTION =
  "When you include code in a response, always wrap it in fenced markdown code blocks and add the language when you can.";

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

    const contents = messages.map((msg, index) => ({
      role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [
        {
          text:
            index === 0 && msg.role === "user"
              ? CODE_FORMAT_INSTRUCTION + "\n\n" + msg.content
              : msg.content,
        },
      ],
    }));

    const response = await this.ai.models.generateContent({
      model: "gemini-2.5-flash",
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

    const contents = messages.map((msg, index) => ({
      role: msg.role === "assistant" ? ("model" as const) : ("user" as const),
      parts: [
        {
          text:
            index === 0 && msg.role === "user"
              ? CODE_FORMAT_INSTRUCTION + "\n\n" + msg.content
              : msg.content,
        },
      ],
    }));

    const stream = await this.ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
    });

    for await (const chunk of stream) {
      const text = chunk.text;
      if (text) onChunk(text);
    }
  }
}
