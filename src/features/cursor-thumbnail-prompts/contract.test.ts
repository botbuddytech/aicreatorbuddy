import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeThumbnailPrompts,
  parseCursorThumbnailPromptRequest,
} from "./contract";

describe("thumbnail prompt contract", () => {
  it("requires a selected title", () => {
    assert.equal(parseCursorThumbnailPromptRequest({ title: "  ", format: "Shorts", intent: "Educational" }), null);
    assert.deepEqual(
      parseCursorThumbnailPromptRequest({
        title: "Why debt compounds",
        format: "Long form",
        intent: "Educational",
      }),
      {
        title: "Why debt compounds",
        format: "Long form",
        intent: "Educational",
      },
    );
  });

  it("keeps distinct visual prompts", () => {
    const prompts = normalizeThumbnailPrompts({
      prompts: ["  Bold yellow caption  ", "Bold yellow caption", "Dark desk, three words"],
    });
    assert.deepEqual(prompts, ["Bold yellow caption", "Dark desk, three words"]);
    assert.equal(normalizeThumbnailPrompts({ prompts: [] }), null);
  });
});
