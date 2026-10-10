import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyDescriptionPromptVariables } from "@/features/cursor-title-generator/prompt";
import {
  descriptionFixNotice,
  normalizeCursorDescription,
  parseCursorDescriptionRequest,
} from "@/features/cursor-description-generator/contract";

describe("cursor description contract", () => {
  it("requires title and script before generation", () => {
    assert.equal(
      descriptionFixNotice({
        topic: "topic",
        title: "",
        length: "1 min",
        orientation: "Shorts",
        videoType: "Educational",
        script: "",
        summary: "summary",
        references: [],
      })?.step,
      "title",
    );
    assert.equal(
      descriptionFixNotice({
        topic: "topic",
        title: "Title",
        length: "1 min",
        orientation: "Shorts",
        videoType: "Educational",
        script: "",
        summary: "summary",
        references: [],
      })?.step,
      "script",
    );
  });

  it("parses description requests", () => {
    const parsed = parseCursorDescriptionRequest({
      topic: "AI video",
      title: "My title",
      length: "60s",
      orientation: "Shorts (9:16)",
      videoType: "Educational",
      script: "HOOK\nSpoken lines",
      summary: "Topic: AI",
      references: [{ title: "Ref", transcript: "Hello" }],
    });
    assert.equal(parsed?.title, "My title");
    assert.equal(parsed?.script, "HOOK\nSpoken lines");
    assert.equal(parsed?.references.length, 1);
  });

  it("normalizes cursor JSON output", () => {
    const parsed = normalizeCursorDescription({
      description: "Line one\nLine two",
      tags: ["youtube", "growth"],
    });
    assert.equal(parsed?.description, "Line one\nLine two");
    assert.deepEqual(parsed?.tags, ["youtube", "growth"]);
  });

  it("fills description prompt tokens", () => {
    const filled = applyDescriptionPromptVariables("Title: {{title}}\nScript:\n{{script}}", {
      topic: "topic",
      title: "My video",
      length: "1 min",
      orientation: "Shorts",
      videoType: "Educational",
      script: "Spoken draft",
      summary: "Intro block",
      references: [],
    });
    assert.match(filled, /My video/);
    assert.match(filled, /Spoken draft/);
  });
});
