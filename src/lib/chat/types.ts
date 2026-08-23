export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

export type ChatSource = "openai" | "gemini" | "specialist";

export type ChatCompleteResult = {
  reply: string;
  source: ChatSource;
};

export type ChatSurface = "marketing" | "login" | "workspace";

export type PageContext = {
  pathname: string;
  surface: ChatSurface;
  title: string;
  summary: string;
  chips: string[];
  greeting: string;
};
