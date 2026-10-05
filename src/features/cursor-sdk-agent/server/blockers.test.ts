import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { blocked } from "./blockers";

describe("agent step blockers", () => {
  it("names the earlier step the same way the fix notice does", () => {
    assert.equal(
      blocked("title", "No title selected", "Select a title there, then generate the script."),
      "No title selected in step 2. Select a title there, then generate the script.",
    );
    assert.equal(
      blocked("summary", "No topic or idea", "Add a topic or idea there, then generate titles."),
      "No topic or idea in step 1. Add a topic or idea there, then generate titles.",
    );
  });
});