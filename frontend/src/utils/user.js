const USER_ID_KEY = "chat-clone-user-id";
const DEFAULT_USER_ID = "demo-user";

export const getOrCreateUserId = () => {
  if (typeof window === "undefined") {
    return DEFAULT_USER_ID;
  }

  const existingUserId = window.localStorage.getItem(USER_ID_KEY);

  if (existingUserId) {
    return existingUserId;
  }

  const generatedUserId = `user-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(USER_ID_KEY, generatedUserId);

  return generatedUserId;
};
