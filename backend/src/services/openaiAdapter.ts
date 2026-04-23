import OpenAI from "openai";
import { AIService, Message } from "./ai.service";

const apiKey = process.env.OPENAI_API_KEY?.trim();
const CODE_FORMAT_INSTRUCTION =
  "When you include code in a response, always wrap it in fenced markdown code blocks and add the language when you can.";

export class OpenAIAdapter implements AIService {
  private openai: OpenAI | null;

  constructor() {
    if (!apiKey) {
      console.warn("OPENAI_API_KEY not found. OpenAI disabled.");
      this.openai = null;
      return;
    }

    this.openai = new OpenAI({
      apiKey,
    });
  }

  async generateResponse(messages: Message[]): Promise<string> {
    if (!this.openai) {
      return "OpenAI not configured. Please add API key.";
    }

    const response = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CODE_FORMAT_INSTRUCTION },
        ...messages,
      ],
    });

    return response.choices[0].message.content || "";
  }

  async streamResponse(
    messages: Message[],
    onChunk: (chunk: string) => void,
  ): Promise<void> {
    if (!this.openai) {
      onChunk("OpenAI not configured. Please add API key.");
      return;
    }

    const stream = await this.openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: CODE_FORMAT_INSTRUCTION },
        ...messages,
      ],
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content || "";
      if (text) onChunk(text);
    }
  }
}
