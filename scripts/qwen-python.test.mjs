import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldSkipPythonInstall } from "./qwen-python.mjs";

describe("qwen python install", () => {
  it("installs on a normal computer", () => {
    assert.equal(shouldSkipPythonInstall({}), false);
  });

  it("skips hosted builds that only need the Next.js app", () => {
    assert.equal(shouldSkipPythonInstall({ VERCEL: "1" }), true);
    assert.equal(shouldSkipPythonInstall({ RAILWAY_ENVIRONMENT: "production" }), true);
    assert.equal(shouldSkipPythonInstall({ RENDER: "true" }), true);
    assert.equal(shouldSkipPythonInstall({ NETLIFY: "true" }), true);
  });
});
