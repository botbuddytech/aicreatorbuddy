import { spawnSync } from "node:child_process";
import { findPython, pythonCommand, requirementsPath, shouldSkipPythonInstall } from "./qwen-python.mjs";

if (shouldSkipPythonInstall()) {
  console.log("[qwen] skipping the Python install on this host.");
  process.exit(0);
}

const python = findPython();
if (!python) {
  console.error("[qwen] Python 3.10+ is required. Install Python, then run npm install again.");
  process.exit(1);
}

const [command, args] = pythonCommand(python, [
  "-m",
  "pip",
  "install",
  "--disable-pip-version-check",
  "-U",
  "-r",
  requirementsPath,
]);
const install = spawnSync(command, args, { stdio: "inherit" });
process.exit(install.status ?? 1);
