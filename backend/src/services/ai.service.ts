export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface AIService {
  generateResponse(messages: Message[]): Promise<string>;

  streamResponse(
    messages: Message[],
    onChunk: (chunk: string) => void,
  ): Promise<void>;
}
