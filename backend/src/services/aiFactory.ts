import { GeminiAdapter } from "./GeminiAdapter";
import { OpenAIAdapter } from "./openaiAdapter";
import { NvidiaAdapter } from "./NvidiaAdapter";
import { AIService } from "./ai.service";

export function getAIService(type: string): AIService {
  if (type === "openai") {
    return new OpenAIAdapter();
  }

  if (type === "nvidia") {
    return new NvidiaAdapter();
  }

  return new GeminiAdapter(); // default
}
