# Cursor CLI config for this computer

This folder holds the Cursor Agent CLI settings for **this machine only**.

The app reads `config/cursor-cli.local.json` on every Cursor CLI call (agent panel, title generation, title scoring, script analysis). That file is gitignored. Each computer keeps its own copy. Do not commit it, and do not put the CLI path in `.env` — `.env` is committed and would overwrite the other computer.

`config/README.md` is the only file in this folder that belongs in Git.

## What to create

Create `config/cursor-cli.local.json` if it is missing, or if its `path` points at a file that does not exist on this computer.

```json
{
  "path": "",
  "model": ""
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `path` | No | Absolute path to the Cursor Agent CLI on **this** computer. Empty string means auto-detect. |
| `model` | No | Optional model id, such as `gpt-5` or `sonnet-4`. Empty string uses the CLI default. Only letters, numbers, and `._:/-`, at most 100 characters. |

`path` longer than 500 characters is ignored. Unknown JSON keys are ignored. Invalid JSON is treated as an empty config.

A path that does not exist on this computer is skipped. The app then auto-detects, and if that fails it tries the `agent` command on `PATH`.

## How to find the path

Set `path` to a binary that actually exists. Do not copy a path from the other computer.

### macOS

Prefer the install from `curl https://cursor.com/install -fsS | bash`.

1. Use `~/.local/bin/agent` when that file exists. Write the absolute path, for example `/Users/me/.local/bin/agent`.
2. Otherwise use the newest `cursor-agent` binary under `~/.local/share/cursor-agent/versions/`.

### Windows

The CLI is not one `agent.exe`. The app runs `node.exe` with the `index.js` that sits in the **same folder**.

1. Look in `%LOCALAPPDATA%\cursor-agent\versions\`.
2. Pick the newest version folder that contains both `node.exe` and `index.js`.
3. Set `path` to that `node.exe`.

In JSON, backslashes must be escaped:

```json
{
  "path": "C:\\Users\\me\\AppData\\Local\\cursor-agent\\versions\\2026.09.18-9a7762b\\node.exe",
  "model": ""
}
```

Do not point `path` at a `.cmd`, `.bat`, or `.ps1` shim. If that is all you can find, leave `path` empty and let auto-detect search `%LOCALAPPDATA%\cursor-agent`.

## After the file exists

1. Confirm the CLI runs. On macOS: `agent --version`. On Windows: run the `node.exe` you wrote into `path` only if you also know it is the Cursor CLI; otherwise run `agent --version` from a terminal where `agent` is on `PATH`.
2. If a later request says the CLI is not authenticated, run `agent login` in a terminal on that computer.
3. Restart is not required for a path change. The app reads this JSON on each request.
4. Leave `config/cursor-cli.local.json` untracked. Do not remove it from `.gitignore`.

## Prompt for the other computer

On the Windows (or any new) checkout, this is enough:

> Read `config/README.md` and create `config/cursor-cli.local.json` for this computer. Find the local Cursor Agent CLI, write its absolute path into that file, and do not commit the file.
