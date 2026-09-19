import "server-only";

import { spawn } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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
    "XDG_CONFIG_HOME",
    "XDG_DATA_HOME",
    "CURSOR_API_KEY",
  ] as const;
  const env: NodeJS.ProcessEnv = { CI: "1", NO_COLOR: "1", NODE_ENV: "production" };
  for (const key of allowed) {
    if (process.env[key]) env[key] = process.env[key];
  }
  return env;
}

function parseAgentEnvelope(stdout: string): unknown {
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
  if (typeof result !== "string") throw new CursorRunnerError("invalid-output");

  const withoutFence = result
    .trim()
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
  const executable = process.env.CURSOR_AGENT_PATH?.trim() || "agent";
  const model = process.env.CURSOR_AGENT_MODEL?.trim();
  if (model && !/^[a-zA-Z0-9._:/-]{1,100}$/.test(model)) {
    throw new CursorRunnerError("failed");
  }

  const args = [
    "-p",
    "--mode",
    "ask",
    "--output-format",
    "json",
    "--sandbox",
    "enabled",
    "--workspace",
    workspace,
    ...(model ? ["--model", model] : []),
    prompt,
  ];

  return new Promise((resolve, reject) => {
    const child = spawn(/* turbopackIgnore: true */ executable, args, {
      cwd: workspace,
      env: minimalEnvironment(),
      shell: false,
      stdio: ["ignore", "pipe", "pipe"],
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
      finish(new CursorRunnerError(code === "ENOENT" ? "missing-cli" : "failed"));
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

export async function runCursorPrompt(
  prompt: string,
  signal?: AbortSignal,
): Promise<unknown> {
  if (generationInProgress) throw new CursorRunnerError("busy");
  generationInProgress = true;

  let workspace: string | null = null;
  try {
    workspace = await mkdtemp(join(tmpdir(), "aicreatorbuddy-cursor-"));
    const stdout = await invokeAgent(workspace, prompt, signal);
    return parseAgentEnvelope(stdout);
  } finally {
    generationInProgress = false;
    if (workspace) await rm(workspace, { recursive: true, force: true });
  }
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
