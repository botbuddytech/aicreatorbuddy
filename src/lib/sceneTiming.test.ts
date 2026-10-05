import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatSceneTiming, planSceneTiming } from "./sceneTiming";

describe("scene timing", () => {
  it("fills a short read out to the scene length with holds", () => {
    const plan = planSceneTiming("Open the loop. Land the claim. Hand it off.", 12);
    assert.ok(plan.elevenLabsText.includes("<break time="));
    assert.ok(Math.abs(plan.plannedSeconds - 12) < 0.6);
    assert.match(formatSceneTiming("Open the loop. Land the claim.", 10), /HOLD the current frame/);
  });

  it("does not invent a long hold when the read already fills the scene", () => {
    const script = Array.from({ length: 40 }, () => "word").join(" ");
    const plan = planSceneTiming(script, 8);
    assert.equal(plan.elevenLabsText.includes("<break time="), false);
  });
});