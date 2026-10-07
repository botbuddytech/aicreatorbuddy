import assert from "node:assert/strict";
import test from "node:test";
import {
  higgsfieldAspect,
  higgsfieldDuration,
  higgsfieldDurationNote,
} from "./duration";

test("higgsfield duration stays inside 3 to 15 seconds", () => {
  assert.deepEqual(higgsfieldDuration(2), { duration: 3, capped: true });
  assert.deepEqual(higgsfieldDuration(8.2), { duration: 8, capped: false });
  assert.deepEqual(higgsfieldDuration(22), { duration: 15, capped: true });
});

test("higgsfield aspect keeps portrait and landscape", () => {
  assert.equal(higgsfieldAspect("9:16"), "9:16");
  assert.equal(higgsfieldAspect("16:9"), "16:9");
  assert.equal(higgsfieldAspect("1:1"), "16:9");
});

test("duration note only appears when the scene length changes", () => {
  assert.equal(higgsfieldDurationNote(8, 8), null);
  assert.match(higgsfieldDurationNote(22, 15) ?? "", /22s/);
});
