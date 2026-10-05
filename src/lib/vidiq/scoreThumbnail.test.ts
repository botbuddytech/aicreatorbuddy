import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { insightFromThumbnailScore, thumbnailScoreFromResult } from "./scoreThumbnail";

describe("vidIQ thumbnail score", () => {
  it("reads the score, summary, strengths, and improvement tips", () => {
    const parsed = thumbnailScoreFromResult({
      score: 89.4,
      feedback: {
        summary: "Good thumbnail with some room for improvement.",
        strengths: [{ message: "Sharp and crisp image" }],
        improvements: [{ message: "There is too much empty space", tip: "Crop tighter on the subject" }],
      },
    });
    assert.ok(parsed);
    assert.equal(parsed?.score, 89);
    assert.equal(parsed?.grade, "A");
    assert.equal(parsed?.strengths[0]?.message, "Sharp and crisp image");
    assert.equal(parsed?.improvements[0]?.tip, "Crop tighter on the subject");
    const insight = insightFromThumbnailScore(parsed!);
    assert.equal(insight.score, 89);
    assert.equal(insight.notes, "Good thumbnail with some room for improvement.");
  });
});