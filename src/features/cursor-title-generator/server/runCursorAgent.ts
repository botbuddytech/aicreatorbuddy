import "server-only";

import { spawn } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  normalizeCursorTitleScores,
  normalizeCursorTitles,
  type CursorTitleScoreRequest,
  type CursorTitleScoreResponse,
  type CursorTitleRequest,
  type CursorTitleResponse,
} from "@/features/cursor-title-generator/contract";

const TIMEOUT_MS = 90_000;
const MAX_OUTPUT_BYTES = 1_000_000;
let generationInProgress = false;

type AgentInvocation = {
  command: string;
  prefixArgs: string[];
};

function nodePlusIndex(nodePath: string): AgentInvocation | null {
  const indexJs = join(dirname(nodePath), "index.js");
  if (!existsSync(nodePath) || !existsSync(indexJs)) return null;
  return { command: nodePath, prefixArgs: [indexJs] };
}

/** Windows Cursor CLI is `node.exe index.js …`, not a single agent.exe. */
function resolveWindowsCursorInstall(hint?: string): AgentInvocation | null {
  const candidates: string[] = [];
  if (hint) {
    const dir = dirname(hint);
    candidates.push(dir);
    candidates.push(join(dir, ".."));
    candidates.push(join(dir, "..", ".."));
  }
  const localAppData = process.env.LOCALAPPDATA?.trim();
  if (localAppData) candidates.push(join(localAppData, "cursor-agent"));

  for (const root of candidates) {
    const direct = nodePlusIndex(join(root, "node.exe"));
    if (direct) return direct;

    const versionsRoot = join(root, "versions");
    if (!existsSync(versionsRoot)) continue;
    let versions: string[] = [];
    try {
      versions = readdirSync(versionsRoot, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .map((entry) => entry.name)
        .sort()
        .reverse();
    } catch {
      continue;
    }
    for (const version of versions) {
      const resolved = nodePlusIndex(join(versionsRoot, version, "node.exe"));
      if (resolved) return resolved;
    }
  }
  return null;
}

function resolveAgentInvocation(): AgentInvocation {
  const configured = process.env.CURSOR_AGENT_PATH?.trim();
  if (!configured) {
    if (process.platform === "win32") {
      return resolveWindowsCursorInstall() ?? { command: "agent", prefixArgs: [] };
    }
    return { command: "agent", prefixArgs: [] };
  }

  if (/node\.exe$/i.test(configured)) {
    return nodePlusIndex(configured) ?? { command: configured, prefixArgs: [] };
  }

  // `.cmd` / `.ps1` shims cannot be spawned with shell:false on Windows.
  if (/\.(cmd|bat|ps1)$/i.test(configured) && process.platform === "win32") {
    return (
      resolveWindowsCursorInstall(configured) ?? {
        command: configured,
        prefixArgs: [],
      }
    );
  }

  return { command: configured, prefixArgs: [] };
}

type CursorRunnerErrorCode =
  | "busy"
  | "cancelled"
  | "missing-cli"
  | "not-authenticated"
  | "timeout"
  | "invalid-output"
  | "failed";

export class CursorRunnerError extends Error {
  constructor(public readonly code: CursorRunnerErrorCode) {
    super(code);
    this.name = "CursorRunnerError";
  }
}

function videoContext(input: CursorTitleRequest | CursorTitleScoreRequest): string {
  return `Topic: ${input.context.topic}
Format: ${input.context.format}
Intent: ${input.context.intent}
Duration: ${input.context.duration}`;
}

function buildTitlePrompt(instruction: string, input: CursorTitleRequest): string {
  return `${instruction}

Video context:
${videoContext(input)}

This is a writing-only task. Do not inspect files, run commands, browse, or call external tools.
Follow the quantity requested in the editable instruction, up to 20 titles.
Return only valid JSON in this shape:
{"titles":["Title one","Title two"]}`;
}

function buildScoringPrompt(instruction: string, input: CursorTitleScoreRequest): string {
  return `${instruction}

Video context:
${videoContext(input)}

Titles to score:
${JSON.stringify(input.titles)}

This is an evaluation-only task. Do not inspect files, run commands, browse, or call external tools.
Return every supplied ID exactly once. Return only valid JSON in this exact shape:
{"scores":[{"id":"the supplied title ID","score":85}]}`;
}

function minimalEnvironment(): NodeJS.ProcessEnv {
  const allowed = [
    "PATH",
    "HOME",
    "USER",
    "TMPDIR",
    "TEMP",
    "TMP",
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "CURSOR_API_KEY",
    // Windows: CreateProcess + Cursor credential/config lookup
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "SYSTEMROOT",
    "WINDIR",
    "COMSPEC",
    "USERNAME",
    "USERDOMAIN",
    "PATHEXT",
  ] as const;
  const env: NodeJS.ProcessEnv = { CI: "1", NO_COLOR: "1", NODE_ENV: "production" };
  for (const key of allowed) {
    if (process.env[key]) env[key] = process.env[key];
  }
  // Unix-style HOME is what some CLIs read; map from Windows when missing.
  if (!env.HOME && process.env.USERPROFILE) env.HOME = process.env.USERPROFILE;
  if (!env.HOME) env.HOME = homedir();
  return env;
}

export function cursorAgentModelLabel(): string {
  const model = process.env.CURSOR_AGENT_MODEL?.trim();
  if (model && /^[a-zA-Z0-9._:/-]{1,100}$/.test(model)) return `Cursor CLI · ${model}`;
  return "Cursor CLI";
}

function readAgentResult(stdout: string): string {
  let envelope: unknown;
  try {
    envelope = JSON.parse(stdout.trim());
  } catch {
    throw new CursorRunnerError("invalid-output");
  }

  if (typeof envelope !== "object" || envelope === null || !("result" in envelope)) {
    throw new CursorRunnerError("invalid-output");
  }
  const result = (envelope as { result?: unknown }).result;
  if (typeof result !== "string" || !result.trim()) throw new CursorRunnerError("invalid-output");
  return result.trim();
}

function parseAgentEnvelope(stdout: string): unknown {
  const result = readAgentResult(stdout);
  const withoutFence = result
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  const start = withoutFence.indexOf("{");
  const finish = withoutFence.lastIndexOf("}");
  if (start < 0 || finish <= start) throw new CursorRunnerError("invalid-output");

  try {
    return JSON.parse(withoutFence.slice(start, finish + 1));
  } catch {
    throw new CursorRunnerError("invalid-output");
  }
}

async function invokeAgent(
  workspace: string,
  prompt: string,
  signal?: AbortSignal,
): Promise<string> {
  const { command, prefixArgs } = resolveAgentInvocation();
  const model = process.env.CURSOR_AGENT_MODEL?.trim();
  if (model && !/^[a-zA-Z0-9._:/-]{1,100}$/.test(model)) {
    throw new CursorRunnerError("failed");
  }

  // Cursor sandbox is macOS/Linux-only; Windows requires allowlist mode.
  const sandboxMode = process.platform === "win32" ? "disabled" : "enabled";

  const args = [
    ...prefixArgs,
    "-p",
    "--mode",
    "ask",
    "--output-format",
    "json",
    "--sandbox",
    sandboxMode,
    "--trust",
    "--workspace",
    workspace,
    ...(model ? ["--model", model] : []),
    prompt,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(/* turbopackIgnore: true */ command, args, {
      cwd: workspace,
      env: minimalEnvironment(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";
    let outputBytes = 0;
    let settled = false;

    const finish = (error?: CursorRunnerError) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      signal?.removeEventListener("abort", onAbort);
      if (error) reject(error);
      else resolve(stdout);
    };
    const stop = (code: CursorRunnerErrorCode) => {
      child.kill("SIGTERM");
      finish(new CursorRunnerError(code));
    };
    const onAbort = () => stop("cancelled");
    const timeout = setTimeout(() => stop("timeout"), TIMEOUT_MS);

    signal?.addEventListener("abort", onAbort, { once: true });
    if (signal?.aborted) return onAbort();

    child.stdout.on("data", (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) return stop("invalid-output");
      stdout += chunk.toString("utf8");
    });
    child.stderr.on("data", (chunk: Buffer) => {
      outputBytes += chunk.length;
      if (outputBytes > MAX_OUTPUT_BYTES) return stop("invalid-output");
      stderr += chunk.toString("utf8");
    });
    child.once("error", (error) => {
      const code = (error as NodeJS.ErrnoException).code;
      // EINVAL is the Windows failure mode for spawning .cmd with shell:false.
      finish(
        new CursorRunnerError(
          code === "ENOENT" || code === "EINVAL" ? "missing-cli" : "failed",
        ),
      );
    });
    child.once("close", (code) => {
      if (settled) return;
      if (code === 0) return finish();
      const detail = stderr.toLocaleLowerCase();
      if (detail.includes("login") || detail.includes("auth")) {
        return finish(new CursorRunnerError("not-authenticated"));
      }
      finish(new CursorRunnerError("failed"));
    });
  });
}

async function cleanupWorkspace(workspace: string): Promise<void> {
  // Windows often keeps Cursor Agent file handles open briefly after exit;
  // failing cleanup must never override a successful generation result.
  const delaysMs = [0, 250, 750, 1500];
  for (const delay of delaysMs) {
    if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
    try {
      await rm(workspace, { recursive: true, force: true });
      return;
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "ENOTEMPTY") {
        return;
      }
    }
  }
}

async function withCursorWorkspace<T>(run: (workspace: string) => Promise<T>): Promise<T> {
  if (generationInProgress) throw new CursorRunnerError("busy");
  generationInProgress = true;

  let workspace: string | null = null;
  try {
    workspace = await mkdtemp(join(tmpdir(), "aicreatorbuddy-cursor-"));
    return await run(workspace);
  } finally {
    generationInProgress = false;
    if (workspace) await cleanupWorkspace(workspace);
  }
}

export async function runCursorPrompt(
  prompt: string,
  signal?: AbortSignal,
): Promise<unknown> {
  return withCursorWorkspace(async (workspace) => {
    const stdout = await invokeAgent(workspace, prompt, signal);
    return parseAgentEnvelope(stdout);
  });
}

export async function runCursorText(prompt: string, signal?: AbortSignal): Promise<string> {
  return withCursorWorkspace(async (workspace) => {
    const stdout = await invokeAgent(workspace, prompt, signal);
    return readAgentResult(stdout);
  });
}

export async function generateTitlesWithCursor(
  instruction: string,
  input: CursorTitleRequest,
  signal?: AbortSignal,
): Promise<CursorTitleResponse> {
  const payload = await runCursorPrompt(buildTitlePrompt(instruction, input), signal);
  const titles = normalizeCursorTitles(payload);
  if (!titles) throw new CursorRunnerError("invalid-output");
  return { titles };
}

export async function scoreTitlesWithCursor(
  instruction: string,
  input: CursorTitleScoreRequest,
  signal?: AbortSignal,
): Promise<CursorTitleScoreResponse> {
  const payload = await runCursorPrompt(buildScoringPrompt(instruction, input), signal);
  const scores = normalizeCursorTitleScores(payload, input.titles);
  if (!scores) throw new CursorRunnerError("invalid-output");
  return { scores };
}
