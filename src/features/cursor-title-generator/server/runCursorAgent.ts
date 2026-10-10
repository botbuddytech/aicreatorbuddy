import "server-only";

import { spawn, spawnSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync } from "node:fs";
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
import {
  applyDescriptionPromptVariables,
  applyScriptPromptVariables,
  applyThumbnailPromptVariables,
  applyTitlePromptVariables,
  applyVisualPromptVariables,
} from "@/features/cursor-title-generator/prompt";
import {
  normalizeCursorDescription,
  type CursorDescriptionRequest,
  type CursorDescriptionResponse,
} from "@/features/cursor-description-generator/contract";
import {
  normalizeCursorScript,
  CURSOR_SCRIPT_LIMITS,
  type CursorScriptRequest,
  type CursorScriptResponse,
} from "@/features/cursor-script-generator/contract";
import { formatScriptSections, MAX_SCENE_SECONDS } from "@/lib/scriptSections";
import { formatSceneTiming } from "@/lib/sceneTiming";
import {
  normalizeThumbnailPrompts,
  type CursorThumbnailPromptRequest,
  type CursorThumbnailPromptResponse,
} from "@/features/cursor-thumbnail-prompts/contract";
import {
  normalizeVisualPrompts,
  type CursorVisualPromptRequest,
  type CursorVisualPromptResponse,
} from "@/features/cursor-visual-prompts/contract";
import { resolveVisualStylePrompt } from "@/features/cursor-visual-prompts/repo";

const TIMEOUT_MS = 90_000;
const SCRIPT_TIMEOUT_MS = 180_000;
const MAX_OUTPUT_BYTES = 1_000_000;
/** Per-machine Cursor CLI settings. See config/README.md. This file is gitignored. */
export const CURSOR_CLI_CONFIG_FILE = "config/cursor-cli.local.json";
export const CURSOR_CLI_MISSING_MESSAGE = `Cursor Agent CLI was not found. Install it or set "path" in ${CURSOR_CLI_CONFIG_FILE}.`;
let generationInProgress = false;

type LocalCliConfig = {
  path: string;
  model: string;
};

function readLocalCliConfig(): LocalCliConfig {
  const empty: LocalCliConfig = { path: "", model: "" };
  const filePath = join(process.cwd(), CURSOR_CLI_CONFIG_FILE);
  if (!existsSync(filePath)) return empty;
  try {
    const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return empty;
    const record = parsed as Record<string, unknown>;
    const path = typeof record.path === "string" ? record.path.trim() : "";
    const model = typeof record.model === "string" ? record.model.trim() : "";
    return {
      path: path.length <= 500 ? path : "",
      model: model.length <= 100 ? model : "",
    };
  } catch {
    return empty;
  }
}

function configuredCliPath(): string {
  return readLocalCliConfig().path || process.env.CURSOR_AGENT_PATH?.trim() || "";
}

function cursorAgentModel(): string {
  const model = readLocalCliConfig().model || process.env.CURSOR_AGENT_MODEL?.trim() || "";
  if (!model) return "";
  if (!/^[a-zA-Z0-9._:/-]{1,100}$/.test(model)) {
    throw new CursorRunnerError("failed", `Invalid model in ${CURSOR_CLI_CONFIG_FILE}.`);
  }
  return model;
}

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

/** macOS/Linux install from `curl https://cursor.com/install | bash`. */
function resolveUnixCursorInstall(): AgentInvocation | null {
  const home = homedir();
  const direct = [
    join(home, ".local", "bin", "agent"),
    join(home, ".local", "bin", "cursor-agent"),
  ];
  for (const candidate of direct) {
    if (existsSync(candidate)) return { command: candidate, prefixArgs: [] };
  }

  const versionsRoot = join(home, ".local", "share", "cursor-agent", "versions");
  if (!existsSync(versionsRoot)) return null;
  let versions: string[] = [];
  try {
    versions = readdirSync(versionsRoot, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .sort()
      .reverse();
  } catch {
    return null;
  }
  for (const version of versions) {
    const binary = join(versionsRoot, version, "cursor-agent");
    if (existsSync(binary)) return { command: binary, prefixArgs: [] };
  }
  return null;
}

function configuredInvocation(configured: string): AgentInvocation | null {
  if (/node\.exe$/i.test(configured)) return nodePlusIndex(configured);

  // `.cmd` / `.ps1` shims cannot be spawned with shell:false on Windows.
  if (/\.(cmd|bat|ps1)$/i.test(configured)) {
    if (process.platform !== "win32") return null;
    return resolveWindowsCursorInstall(configured);
  }

  // A path for the other computer is ignored when that file is not on this one.
  if (!existsSync(configured)) return null;
  return { command: configured, prefixArgs: [] };
}

function resolveAgentInvocation(): AgentInvocation {
  const configured = configuredCliPath();
  if (configured) {
    const fromConfig = configuredInvocation(configured);
    if (fromConfig) return fromConfig;
  }

  if (process.platform === "win32") {
    return resolveWindowsCursorInstall() ?? { command: "agent", prefixArgs: [] };
  }
  return resolveUnixCursorInstall() ?? { command: "agent", prefixArgs: [] };
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
  constructor(
    public readonly code: CursorRunnerErrorCode,
    public readonly detail = "",
  ) {
    super(code);
    this.name = "CursorRunnerError";
  }
}

let trustFlagSupported: boolean | null = null;

/** Older Cursor CLIs reject unknown flags, including `--trust`. */
function agentAcceptsTrustFlag(command: string, prefixArgs: string[]): boolean {
  if (trustFlagSupported !== null) return trustFlagSupported;
  try {
    const help = spawnSync(/* turbopackIgnore: true */ command, [...prefixArgs, "--help"], {
      encoding: "utf8",
      timeout: 20_000,
      windowsHide: true,
      env: minimalEnvironment(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    if (help.status !== 0) return false;
    const text = `${help.stdout ?? ""}\n${help.stderr ?? ""}`;
    trustFlagSupported = /(?:^|\s)--trust\b/.test(text);
    return trustFlagSupported;
  } catch {
    return false;
  }
}

function cliFailureDetail(stderr: string): string {
  const line =
    stderr
      .replace(/\u001b\[[0-9;]*m/g, "")
      .split(/\r?\n/)
      .map((item) => item.trim())
      .find((item) => item.length > 0) ?? "";
  return line.slice(0, 180);
}

function videoContext(input: CursorTitleRequest | CursorTitleScoreRequest): string {
  return `Topic: ${input.context.topic.trim() || "Not provided. Score each title on its own wording."}
Format: ${input.context.format}
Intent: ${input.context.intent}
Duration: ${input.context.duration}`;
}

function referenceTitleExample(titles: readonly string[]): string {
  const items = titles.map((title) => title.trim()).filter(Boolean);
  return JSON.stringify({
    titles: items.length ? items : ["No reference video title was provided"],
  });
}

function buildTitlePrompt(instruction: string, input: CursorTitleRequest): string {
  const filled = applyTitlePromptVariables(instruction, {
    topic: input.context.topic,
    referenceTitles: input.referenceTitles,
    referenceTranscripts: input.referenceTitles.map((title, index) => ({
      title,
      transcript: input.referenceTranscripts[index] ?? "",
    })),
  });
  return `${filled}

Video context:
Format: ${input.context.format}
Intent: ${input.context.intent}
Duration: ${input.context.duration}

This is a writing-only task. Do not inspect files, run commands, browse, or call external tools.
Follow the quantity requested in the editable instruction, up to 20 titles.
Reference video titles for this video:
${referenceTitleExample(input.referenceTitles)}
Return only valid JSON in this shape, with the new titles you write:
{"titles":["your first new title","your second new title"]}`;
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
  try {
    const model = cursorAgentModel();
    if (model) return `Cursor CLI · ${model}`;
  } catch {
    /* An invalid model still has a label; invokeAgent reports the error. */
  }
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
  timeoutMs = TIMEOUT_MS,
): Promise<string> {
  const { command, prefixArgs } = resolveAgentInvocation();
  const model = cursorAgentModel();

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
    ...(agentAcceptsTrustFlag(command, prefixArgs) ? ["--trust"] : []),
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
    const timeout = setTimeout(() => stop("timeout"), timeoutMs);

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
      finish(new CursorRunnerError("failed", cliFailureDetail(stderr)));
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
  timeoutMs = TIMEOUT_MS,
): Promise<unknown> {
  return withCursorWorkspace(async (workspace) => {
    const stdout = await invokeAgent(workspace, prompt, signal, timeoutMs);
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
  const promptUsed = buildTitlePrompt(instruction, input);
  const payload = await runCursorPrompt(promptUsed, signal);
  const titles = normalizeCursorTitles(payload);
  if (!titles) throw new CursorRunnerError("invalid-output");
  return { titles, promptUsed };
}

function buildThumbnailPrompt(instruction: string, input: CursorThumbnailPromptRequest): string {
  const filled = applyThumbnailPromptVariables(instruction, input.title);
  return `${filled}

Video context:
Format: ${input.format}
Intent: ${input.intent}

This is a writing-only task. Do not create images, inspect files, run commands, browse, or call external tools.
Follow the quantity requested in the editable instruction, up to 8 prompts.
Each item must be a visual brief for an image generator.
Return only valid JSON in this shape:
{"prompts":["Prompt one","Prompt two"]}`;
}

export async function generateThumbnailPromptsWithCursor(
  instruction: string,
  input: CursorThumbnailPromptRequest,
  signal?: AbortSignal,
): Promise<CursorThumbnailPromptResponse> {
  const promptUsed = buildThumbnailPrompt(instruction, input);
  const payload = await runCursorPrompt(promptUsed, signal);
  const prompts = normalizeThumbnailPrompts(payload);
  if (!prompts) throw new CursorRunnerError("invalid-output");
  return { prompts, promptUsed };
}

function buildScriptPrompt(instruction: string, input: CursorScriptRequest): string {
  const filled = applyScriptPromptVariables(instruction, input);
  const needed = Math.ceil(input.durationSeconds / MAX_SCENE_SECONDS);
  const minCount = Math.min(
    CURSOR_SCRIPT_LIMITS.maxSections,
    Math.max(CURSOR_SCRIPT_LIMITS.minSections, needed),
  );
  const maxCount = Math.min(CURSOR_SCRIPT_LIMITS.maxSections, minCount + 4);
  return `${filled}

This is a writing-only task. Do not inspect files, run commands, browse, or call external tools.
Return ${minCount} to ${maxCount} sections. The first label must be HOOK and the last label must be OUTRO.
Allowed labels: HOOK, INTRO, POINT 1, POINT 2, POINT 3, further POINT numbers, PROOF, CTA, OUTRO.
A label may add a short beat name after an em dash, such as "POINT 1 — The real bottleneck".
Each section is one scene. durationSeconds is an integer from 1 to ${MAX_SCENE_SECONDS}. A scene can be shorter than ${MAX_SCENE_SECONDS} seconds and must never be longer.
Total runtime: ${input.durationSeconds} seconds. The durationSeconds integers must add up to that runtime. Add another POINT scene instead of making one scene longer than ${MAX_SCENE_SECONDS} seconds.
Pace the spoken words at about 2.3 words per second, roughly 140 words per minute: a natural pace, not rushed and not drawn out.
Write about durationSeconds times 2.3 words in each section. HOOK, CTA, and OUTRO are usually shorter than a POINT.
Each script is spoken words only. Do not repeat the label or the duration inside the script, and do not leave a blank line inside a section.
Reference videos show the kind of idea to explore. Do not copy their sentences, claims, or order of points.
Return only valid JSON in this shape:
{"sections":[{"label":"HOOK","durationSeconds":6,"script":"spoken words"},{"label":"OUTRO","durationSeconds":4,"script":"spoken words"}]}`;
}

function buildVisualPrompt(instruction: string, input: CursorVisualPromptRequest): string {
  const film = [...input.sequence].sort((a, b) => a.order - b.order);
  const writeIds = new Set(input.scenes.map((scene) => scene.id));
  const blocks = film.map((scene, index) => {
    const previous = index > 0 ? film[index - 1] : null;
    const filled = applyVisualPromptVariables(instruction, {
      section: scene.section,
      script: scene.script,
      duration: String(scene.durationSeconds),
      aspectRatio: input.aspectRatio,
      topic: input.topic,
      title: input.title,
    });
    const next = film[index + 1];
    const handoff = previous
      ? `Previous scene: ${previous.order}. ${previous.section}. Open this clip on that scene's last frame.\n${
          previous.existingPrompt
            ? `Previous scene's picture, match this look exactly:\n${previous.existingPrompt}`
            : `Previous spoken line:\n${previous.script}`
        }`
      : input.stylePrompt
        ? "This is the first frame of the film. Establish the visual style so every later scene keeps it."
        : "This is the first frame of the film. Establish a look with no people that every later scene must keep.";
    const forward = next
      ? `\nNext scene: ${next.order}. ${next.section}. End this clip on a frame that scene can continue.\n${
          next.existingPrompt ? `Next scene's picture:\n${next.existingPrompt}` : `Next spoken line:\n${next.script}`
        }`
      : "";
    const timing = formatSceneTiming(scene.script, scene.durationSeconds);
    const styleNote = input.stylePrompt
      ? "Ignore any no-people rule below. The visual style at the end decides who and what appears.\n"
      : "";
    const stillNote =
      scene.clipSource === "still"
        ? `Clip source: still. imagePrompt is one opening frame in this scene's visual style. No camera move and no duration. prompt starts on that still and moves for ${scene.durationSeconds} seconds. Do not invent a different opening frame.\n`
        : "Clip source: direct. Write one clip prompt. imagePrompt must be an empty string.\n";
    return `Scene ${scene.order} of ${film.length}
Scene id: ${scene.id}
Write a new prompt: ${writeIds.has(scene.id) ? "yes" : "no, context only"}
${stillNote}${styleNote}${handoff}${forward}
Voice timing for this scene. The picture must follow these holds. When the voice holds, the frame holds:
${timing}

${filled}`;
  });
  return `${blocks.join("\n\n---\n\n")}

This is a writing-only task. Do not create video, inspect files, run commands, browse, or call external tools.
The scenes above are one continuous film in that order. They must not look like unrelated clips joined together.
When only some scenes are marked "yes", treat every other scene's existing picture as locked reference. Copy its objects, palette, light, lens, and framing. Do not invent a new visual style for that one scene.
${
  input.stylePrompt
    ? `Visual style for the shot. Write the picture in this look. Do not paste this paragraph into the prompt:
${input.stylePrompt}
Show the subjects this style needs. They act inside the scene.
Do not write the style's name, the studio's name, or the channel's name in the prompt. Describe the look only. The picture must not show that name as a logo, title, watermark, or caption.`
    : "No style is selected. Do not put people, faces, hands, bodies, silhouettes, presenters, crowds, or characters in the shot. Use objects, places, diagrams, machines, nature, light, or abstract motion."
}
Do not write an avoid list, a narration-rules paragraph, or the words "not", "no host", or "no cartoon" as exclusions. Those are added after you write.
When the spoken line names a word, phrase, ticker, or number, spell that text in the prompt in quotes. Do not hide those words as illegible, unreadable, fake, slabs, or word-shaped blocks.
Lock one visual world and repeat it in every prompt you write: the same color grade, light, lens, time of day, and environment.
Each clip prompt must be specific: the opening frame, what is in the frame, where the camera is, how it moves, and the exact closing frame.
From the second scene on, the opening frame is the closing frame of the previous scene. Name that handoff. Keep the same objects in the same place in the frame, then continue the motion. When the scene is a still, that opening frame is imagePrompt.
Inside a scene, follow its voice timing. A HOLD is a pause in the voice: do not cut, do not introduce a new action, and hold the current frame for that many seconds.
Write a new prompt only for the scene ids marked "yes".
Each clip prompt must say the clip is exactly that scene's duration in seconds and the aspect ratio is exactly ${input.aspectRatio}.
For a direct scene, imagePrompt must be an empty string.
For a still scene, imagePrompt is one opening frame in the same visual style: what is in the frame, the light, and the lens. No camera move, no duration, and do not say "Create a clip". The prompt field starts on that still and moves for the scene length. Do not invent a different opening frame.
A short spoken line of four words or fewer must appear in the prompt as readable text, in quotes, exactly as spoken. "Force majeure" must be the words Force majeure, not a blank block.
The same rules apply to imagePrompt and prompt. If a visual style is set, both follow it, including any characters it needs.
Return only valid JSON in this shape:
{"prompts":[{"id":"scene id","prompt":"clip prompt","imagePrompt":""}]}`;
}

export async function generateVisualPromptsWithCursor(
  instruction: string,
  input: CursorVisualPromptRequest,
  signal?: AbortSignal,
): Promise<CursorVisualPromptResponse> {
  const stylePrompt = await resolveVisualStylePrompt(input.styleId, input.stylePrompt);
  const resolved = { ...input, stylePrompt };
  const promptUsed = buildVisualPrompt(instruction, resolved);
  const timeoutMs = input.scenes.length > 1 ? SCRIPT_TIMEOUT_MS : TIMEOUT_MS;
  const payload = await runCursorPrompt(promptUsed, signal, timeoutMs);
  const prompts = normalizeVisualPrompts(
    payload,
    input.scenes,
    input.aspectRatio,
    stylePrompt,
    input.styleId,
  );
  if (!prompts) throw new CursorRunnerError("invalid-output");
  return { prompts, promptUsed };
}

export async function generateScriptWithCursor(
  instruction: string,
  input: CursorScriptRequest,
  signal?: AbortSignal,
): Promise<CursorScriptResponse> {
  const promptUsed = buildScriptPrompt(instruction, input);
  const payload = await runCursorPrompt(promptUsed, signal, SCRIPT_TIMEOUT_MS);
  const sections = normalizeCursorScript(payload, input.durationSeconds);
  if (!sections) throw new CursorRunnerError("invalid-output");
  return { sections, script: formatScriptSections(sections), promptUsed };
}

function buildDescriptionPrompt(instruction: string, input: CursorDescriptionRequest): string {
  const filled = applyDescriptionPromptVariables(instruction, input);
  return `${filled}

This is a writing-only task. Do not inspect files, run commands, browse, or call external tools.
Return only valid JSON in this shape:
{"description":"full YouTube description text","tags":["tag one","tag two"]}`;
}

export async function generateDescriptionWithCursor(
  instruction: string,
  input: CursorDescriptionRequest,
  signal?: AbortSignal,
): Promise<CursorDescriptionResponse> {
  const promptUsed = buildDescriptionPrompt(instruction, input);
  const payload = await runCursorPrompt(promptUsed, signal, TIMEOUT_MS);
  const parsed = normalizeCursorDescription(payload);
  if (!parsed) throw new CursorRunnerError("invalid-output");
  return { ...parsed, promptUsed };
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
