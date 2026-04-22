import { GeminiAdapter } from "./GeminiAdapter";
import { OpenAIAdapter } from "./openaiAdapter";
import { AIService } from "./ai.service";

export function getAIService(type: string): AIService {
  if (type === "openai") {
    return new OpenAIAdapter();
  }

  return new GeminiAdapter(); // default
}
