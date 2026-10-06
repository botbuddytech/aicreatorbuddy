import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { findPython, pythonCommand, repoRoot, serverPath } from "./qwen-python.mjs";

const nextBin = path.join(repoRoot, "node_modules", "next", "dist", "bin", "next");
const voicePort = process.env.QWEN_PORT || process.env.CHATTERBOX_PORT || "8765";
const voiceLogPath = path.join(repoRoot, "services", "qwen", "voice.log");

let stopping = false;
let voiceChild = null;
let voiceRestarts = 0;

async function voiceAlreadyRunning() {
  try {
    const response = await fetch(`http://127.0.0.1:${voicePort}/health`, {
      signal: AbortSignal.timeout(1000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

function startVoice(python) {
  if (stopping || voiceChild) return;
  fs.mkdirSync(path.dirname(voiceLogPath), { recursive: true });
  const log = fs.createWriteStream(voiceLogPath, { flags: "a" });
  const [command, args] = pythonCommand(python, [serverPath]);
  const child = spawn(command, args, {
    cwd: repoRoot,
    env: { ...process.env, PYTHONUNBUFFERED: "1", PYTORCH_ENABLE_MPS_FALLBACK: "1" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  child.stdout?.pipe(log);
  child.stderr?.pipe(log);
  voiceChild = child;
  child.on("exit", (code, signal) => {
    if (voiceChild === child) voiceChild = null;
    log.end();
    if (stopping || signal === "SIGINT" || signal === "SIGTERM" || code === 0) return;
    voiceRestarts += 1;
    if (voiceRestarts > 5) {
      console.error("[voice] Qwen stopped restarting. Next.js is still running.");
      return;
    }
    console.error(`[voice] Qwen exited (${code ?? signal}). Restarting…`);
    setTimeout(() => startVoice(python), 2000);
  });
}

function stopVoice() {
  stopping = true;
  voiceChild?.kill("SIGTERM");
}

process.on("SIGINT", stopVoice);
process.on("SIGTERM", stopVoice);

const python = findPython();
if (!python) {
  console.error("[voice] Python 3.10+ was not found. Install Python, then run npm install.");
} else if (await voiceAlreadyRunning()) {
  console.log(`[voice] Qwen is already running at http://127.0.0.1:${voicePort}`);
} else {
  console.log(`[voice] Starting Qwen in the background. Log: services/qwen/voice.log`);
  startVoice(python);
}

const next = spawn(process.execPath, [nextBin, "dev"], {
  cwd: repoRoot,
  stdio: "inherit",
});

next.on("exit", (code, signal) => {
  stopVoice();
  process.exit(code ?? (signal ? 1 : 0));
});
