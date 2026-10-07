import assert from "node:assert/strict";
import test from "node:test";
import { cutProgress, entranceProgress, transitionSpanFrames } from "./cutTransition";

test("a join stays inside the clip and starts at its end", () => {
  assert.equal(transitionSpanFrames(4, 0.5, 30), 15);
  assert.equal(transitionSpanFrames(0.2, 2, 30), 5);
  assert.equal(cutProgress(100, 120, 15), null);
  assert.equal(cutProgress(105, 120, 15), 0);
  assert.equal(cutProgress(119, 120, 15), 1);
  assert.equal(entranceProgress(0, 15), 0);
  assert.equal(entranceProgress(14, 15), 1);
  assert.equal(entranceProgress(15, 15), null);
});
