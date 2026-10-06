import { createHash } from "node:crypto";
import path from "node:path";

const SPEAKER_LANGUAGE: Record<string, string> = {
  Ryan: "English",
  Aiden: "English",
  Vivian: "Chinese",
  Serena: "Chinese",
  Uncle_Fu: "Chinese",
  Dylan: "Chinese",
  Eric: "Chinese",
  Ono_Anna: "Japanese",
  Sohee: "Korean",
};

/** Same digest the Qwen server uses for services/qwen/cache/{hash}.wav. */
export function qwenCacheWavPath(voiceId: string, text: string) {
  const language = SPEAKER_LANGUAGE[voiceId] ?? "English";
  const normalized = text.replace(/\s+/g, " ").trim();
  const digest = createHash("sha256")
    .update(`${voiceId}\0${language}\0${normalized}`, "utf8")
    .digest("hex");
  return path.join(process.cwd(), "services", "qwen", "cache", `${digest}.wav`);
}
