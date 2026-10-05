import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/** Bearer token from a Cursor mcp.json vidIQ server, if one is configured. */
export function vidiqBearerFromMcpConfig(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const servers = (value as { mcpServers?: unknown }).mcpServers;
  if (!servers || typeof servers !== "object") return null;
  for (const server of Object.values(servers as Record<string, unknown>)) {
    if (!server || typeof server !== "object") continue;
    const record = server as { url?: unknown; headers?: unknown };
    const url = typeof record.url === "string" ? record.url : "";
    if (!url.includes("mcp.vidiq.com")) continue;
    if (!record.headers || typeof record.headers !== "object") continue;
    const headers = record.headers as Record<string, unknown>;
    const raw = headers.Authorization ?? headers.authorization;
    if (typeof raw !== "string") continue;
    const token = raw.replace(/^Bearer\s+/i, "").trim();
    if (token) return token;
  }
  return null;
}

/** Local Cursor vidIQ MCP token. Development only, so a missing app connection can still generate. */
export function readCursorVidiqBearer(): string | null {
  if (process.env.NODE_ENV === "production") return null;
  try {
    const raw = readFileSync(join(homedir(), ".cursor", "mcp.json"), "utf8");
    return vidiqBearerFromMcpConfig(JSON.parse(raw));
  } catch {
    return null;
  }
}
