import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { scenesFromScript } from "./scenesFromScript";
import { formatScriptSections } from "./scriptSections";

describe("scenesFromScript", () => {
  it("splits a saved script into section, duration, and spoken lines", () => {
    const script = formatScriptSections([
      { label: "HOOK", script: "Open the loop.", durationSeconds: 6 },
      { label: "POINT 1 — The quiet math", script: "One percent, repeated.", durationSeconds: 14 },
      { label: "CTA", script: "Write it down.", durationSeconds: 6 },
      { label: "OUTRO", script: "Close it.", durationSeconds: 4 },
    ]);
    const scenes = scenesFromScript(script);
    assert.ok(scenes);
    assert.equal(scenes.length, 4);
    assert.equal(scenes[0]?.sectionLabel, "HOOK");
    assert.equal(scenes[0]?.finalScript, "Open the loop.");
    assert.equal(scenes[0]?.editing.durationSeconds, 6);
    assert.equal(scenes[0]?.editing.scriptDurationSeconds, 6);
    assert.equal(scenes[0]?.visuals.description, "");
    assert.equal(scenes[0]?.editing.notes, "");
    assert.equal(scenes[1]?.sectionLabel, "POINT 1 — The quiet math");
    assert.equal(scenes[1]?.finalScript, "One percent, repeated.");
    assert.equal(scenes[3]?.sectionLabel, "OUTRO");
    assert.equal(scenes[3]?.editing.durationSeconds, 4);
  });

  it("returns null when there is no labeled script to split", () => {
    assert.equal(scenesFromScript(""), null);
    assert.equal(scenesFromScript("   "), null);
    assert.equal(scenesFromScript("Just a paragraph with no sections."), null);
  });
});
