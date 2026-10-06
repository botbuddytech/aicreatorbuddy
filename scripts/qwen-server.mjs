import { spawn } from "node:child_process";
import { findPython, pythonCommand, serverPath } from "./qwen-python.mjs";

const python = findPython();
if (!python) {
  console.error("[qwen] Python 3.10+ is required. Install Python, then run npm install again.");
  process.exit(1);
}

const [command, args] = pythonCommand(python, [serverPath]);
const child = spawn(command, args, {
  stdio: "inherit",
  env: { ...process.env, PYTHONUNBUFFERED: "1", PYTORCH_ENABLE_MPS_FALLBACK: "1" },
});

child.on("exit", (code, signal) => {
  if (signal) process.exit(1);
  process.exit(code ?? 1);
});
