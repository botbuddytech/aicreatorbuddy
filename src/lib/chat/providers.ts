import { mockSpecialistReply } from "@/lib/chat/mockSpecialist";
import { buildSystemPrompt } from "@/lib/chat/persona";
import type { ChatCompleteResult, ChatMessage } from "@/lib/chat/types";

const OPENAI_URL = "https://api.openai.com/v1/chat/completions";
const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function delay(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function clipMessages(messages: ChatMessage[]) {
  const trimmed = messages
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 4000),
    }))
    .filter((message) => message.content.length > 0)
    .slice(-16);

  if (trimmed[0]?.role === "assistant") {
    return trimmed.slice(1);
  }
  return trimmed;
}

async function completeOpenAI(system: string, messages: ChatMessage[], signal: AbortSignal) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;

  const model = process.env.OPENAI_CHAT_MODEL || "gpt-4o-mini";
  const response = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      max_tokens: 500,
      messages: [{ role: "system", content: system }, ...messages],
    }),
    signal,
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = data.choices?.[0]?.message?.content?.trim();
  return text || null;
}

async function completeGemini(system: string, messages: ChatMessage[], signal: AbortSignal) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;

  const model = process.env.GEMINI_CHAT_MODEL || "gemini-2.0-flash";
  const contents = messages.map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: message.content }],
  }));

  if (contents[0]?.role === "model") {
    contents.shift();
  }
  if (contents.length === 0) return null;

  const response = await fetch(`${GEMINI_BASE}/${model}:generateContent?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents,
      generationConfig: { temperature: 0.7, maxOutputTokens: 500 },
    }),
    signal,
  });

  if (!response.ok) return null;
  const data = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
  };
  const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  return text || null;
}

export async function completeChat(input: { messages: ChatMessage[]; pathname: string }): Promise<ChatCompleteResult> {
  const system = buildSystemPrompt(input.pathname);
  const messages = clipMessages(input.messages);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);

  try {
    try {
      const openai = await completeOpenAI(system, messages, controller.signal);
      if (openai) return { reply: openai, source: "openai" };
    } catch {
      /* fall through */
    }

    try {
      const gemini = await completeGemini(system, messages, controller.signal);
      if (gemini) return { reply: gemini, source: "gemini" };
    } catch {
      /* fall through */
    }
  } finally {
    clearTimeout(timer);
  }

  if (!process.env.OPENAI_API_KEY && !process.env.GEMINI_API_KEY) {
    await delay(550 + Math.floor(Math.random() * 500));
  }

  return {
    reply: mockSpecialistReply({ messages: input.messages, pathname: input.pathname }),
    source: "specialist",
  };
}
