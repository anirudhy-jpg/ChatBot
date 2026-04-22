export interface ChatApiMessage {
  _id?: string;
  role: "user" | "assistant";
  content: string;
}

export interface ChatApiChat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface FetchMessagesResponse {
  messages?: ChatApiMessage[];
  chatId?: string | null;
}

export interface FetchChatsResponse {
  chats?: ChatApiChat[];
}

export function fetchMessages(
  userId: string,
  chatId?: string | null,
): Promise<FetchMessagesResponse>;

export function sendChatMessage(
  userId: string,
  message: string,
  chatId?: string | null,
  model?: string,
): Promise<FetchMessagesResponse>;

export function fetchChats(userId: string): Promise<FetchChatsResponse>;

export function clearChat(
  userId: string,
  chatId?: string | null,
): Promise<unknown>;
