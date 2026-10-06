import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const repoRoot = root;
export const requirementsPath = path.join(root, "services", "qwen", "requirements.txt");
export const serverPath = path.join(root, "services", "qwen", "server.py");

/** Cloud builds should not download the voice model. A local clone still installs it. */
export function shouldSkipPythonInstall(env = process.env) {
  return Boolean(env.VERCEL || env.RAILWAY_ENVIRONMENT || env.RENDER || env.NETLIFY);
}

function candidates() {
  if (process.platform === "win32") {
    return [
      ["py", ["-3"]],
      ["python", []],
      ["python3", []],
    ];
  }
  return [
    ["python3", []],
    ["python", []],
  ];
}

/** Python 3.10+ on PATH. `command` plus any launcher args (`py -3`). */
export function findPython() {
  for (const [command, prefix] of candidates()) {
    const probe = spawnSync(
      command,
      [...prefix, "-c", "import sys; raise SystemExit(0 if sys.version_info >= (3, 10) else 1)"],
      { encoding: "utf8", timeout: 10_000 },
    );
    if (probe.status === 0) return { command, prefix };
  }
  return null;
}

export function pythonCommand(python, args) {
  return [python.command, [...python.prefix, ...args]];
}
