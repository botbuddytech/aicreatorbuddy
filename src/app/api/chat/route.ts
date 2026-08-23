import { completeChat } from "@/lib/chat/providers";
import type { ChatMessage } from "@/lib/chat/types";

export const dynamic = "force-dynamic";

const PATH_PATTERN = /^\/[\w\-./]*$/;

function isChatMessage(value: unknown): value is ChatMessage {
  if (!value || typeof value !== "object") return false;
  const message = value as { role?: unknown; content?: unknown };
  return (
    (message.role === "user" || message.role === "assistant") &&
    typeof message.content === "string" &&
    message.content.length > 0 &&
    message.content.length <= 4000
  );
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return Response.json({ error: "Invalid body." }, { status: 400 });
  }

  const { messages, pathname } = body as { messages?: unknown; pathname?: unknown };

  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 24 || !messages.every(isChatMessage)) {
    return Response.json({ error: "Invalid messages." }, { status: 400 });
  }

  if (typeof pathname !== "string" || pathname.length > 200 || !PATH_PATTERN.test(pathname.split("?")[0] || "/")) {
    return Response.json({ error: "Invalid path." }, { status: 400 });
  }

  const last = messages[messages.length - 1];
  if (last.role !== "user") {
    return Response.json({ error: "Last message must be from you." }, { status: 400 });
  }

  try {
    const result = await completeChat({
      messages,
      pathname: pathname.split("?")[0] || "/",
    });
    return Response.json(result);
  } catch {
    return Response.json({ error: "Buddy hit a snag. Try that again." }, { status: 500 });
  }
}
