import OpenAI from "openai";
import { AIService, Message } from "./ai.service";

const apiKey = process.env.NVIDIA_API_KEY?.trim();
const CODE_FORMAT_INSTRUCTION =
  "When you include code in a response, always wrap it in fenced markdown code blocks and add the language when you can.";

export class NvidiaAdapter implements AIService {
  private openai: OpenAI | null;

  constructor() {
    if (!apiKey) {
      console.warn("NVIDIA_API_KEY not found. NVIDIA disabled.");
      this.openai = null;
      return;
    }

    this.openai = new OpenAI({
      apiKey,
      baseURL: "https://integrate.api.nvidia.com/v1",
    });
  }

  async generateResponse(messages: Message[]): Promise<string> {
    if (!this.openai) {
      return "NVIDIA not configured. Please add API key.";
    }

    const response = await this.openai.chat.completions.create({
      model: "meta/llama-3.1-70b-instruct",
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
      onChunk("NVIDIA not configured. Please add API key.");
      return;
    }

    const stream = await this.openai.chat.completions.create({
      model: "meta/llama-3.1-70b-instruct",
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
