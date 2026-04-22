import axios from "axios";

// Create axios instance with base configuration
const api = axios.create({
  baseURL: "http://localhost:5000/api",
  timeout: 10000,
});

// Request interceptor to add user ID header
api.interceptors.request.use((config) => {
  const userId = window.Clerk?.user?.id;

  config.headers["x-user-id"] = userId;
  return config;
});

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      // Server responded with error status
      const message =
        error.response.data?.error ||
        `Request failed with status ${error.response.status}`;
      throw new Error(message);
    } else if (error.request) {
      // Request was made but no response received
      throw new Error("Network error - please check your connection");
    } else {
      // Something else happened
      throw new Error(error.message || "An unexpected error occurred");
    }
  },
);

export const fetchMessages = async (userId, chatId = null) => {
  const url = chatId ? `/chat/${chatId}` : "/chat";
  const response = await api.get(url);
  return response.data;
};

export const sendChatMessage = async (
  userId,
  message,
  chatId = null,
  model = "gemini",
) => {
  const response = await api.post("/chat", { message, chatId, model });
  return response.data;
};

export const fetchChats = async (userId) => {
  const response = await api.get("/chat/list");
  return response.data;
};

export const clearChat = async (userId, chatId = null) => {
  const url = chatId ? `/chat/${chatId}` : "/chat";
  const response = await api.delete(url);
  return response.data;
};
