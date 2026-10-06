import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AgentContextPayload } from "@/lib/agent/types";
import { assistantDelta, projectChangeFromTool, unwrapMcpTool } from "./changes";

const context: AgentContextPayload = {
  brief: "Old brief",
  title: "Old title",
  script: "Old script",
  description: "Old description",
  thumbnail: "Old thumb",
  timeline: "Hook: old",
  channel: "Desk",
  step: "script",
  projectName: "Untitled video",
  format: "long-form",
  durationSeconds: 300,
  intent: "educational",
  projectId: "project-1",
  selectedTitle: "Old title",
  titleOptions: [],
  thumbnails: [],
  scenes: [],
  references: [],
  visualStyle: null,
  visualStylePrompt: "",
};

describe("cursor sdk chat helpers", () => {
  it("treats a longer snapshot as one new suffix", () => {
    const first = assistantDelta("", "Hello");
    const second = assistantDelta(first.sent, "Hello there");
    assert.equal(first.delta, "Hello");
    assert.equal(second.delta, " there");
    assert.equal(second.sent, "Hello there");
  });

  it("appends a fresh assistant chunk", () => {
    const next = assistantDelta("Hello", "More");
    assert.equal(next.delta, "More");
    assert.equal(next.sent, "HelloMore");
  });

  it("builds a pending script change from tool arguments", () => {
    const change = projectChangeFromTool("editScript", { script: "  New script  " }, context, "call-1");
    assert.ok(change);
    assert.equal(change?.tool, "editScript");
    assert.equal(change?.status, "pending");
    assert.equal(change?.before, "Old script");
    assert.equal(change?.payload.type === "script" ? change.payload.script : "", "New script");
  });

  it("reads the project tool name from an mcp wrapper", () => {
    const call = unwrapMcpTool("mcp", { toolName: "editScript", args: { script: "Next" } });
    const change = projectChangeFromTool(call.name, call.args, context, "call-3");
    assert.equal(call.name, "editScript");
    assert.equal(change?.payload.type === "script" ? change.payload.script : "", "Next");
  });
  it("keeps the opening-frame prompt beside a clip prompt", () => {
    const change = projectChangeFromTool(
      "generateVisualPrompts",
      { prompts: [{ id: "scene-1", prompt: "Move across the desk.", imagePrompt: "A dark desk." }] },
      context,
      "call-visual",
    );
    assert.equal(change?.payload.type, "visualPrompts");
    const prompts = change?.payload.type === "visualPrompts" ? change.payload.prompts : [];
    assert.equal(prompts[0]?.prompt, "Move across the desk.");
    assert.equal(prompts[0]?.imagePrompt, "A dark desk.");
  });

  it("proposes a project name change", () => {
    const change = projectChangeFromTool("setProjectName", { name: "  Oracle video  " }, context, "call-4");
    assert.equal(change?.tool, "setProjectName");
    assert.equal(change?.before, "Untitled video");
    assert.equal(change?.payload.type === "name" ? change.payload.name : "", "Oracle video");
  });

  it("proposes a reference video and rejects a bad link", () => {
    const change = projectChangeFromTool(
      "addReference",
      { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" },
      context,
      "call-5",
    );
    assert.equal(change?.payload.type, "addReference");
    assert.equal(projectChangeFromTool("addReference", { url: "not a video" }, context, "call-6"), null);
  });

  it("snaps an approximate length onto the long-form steps", () => {
    const change = projectChangeFromTool("setApproxLength", { seconds: 490 }, context, "call-7");
    assert.equal(change?.before, "5 min");
    assert.equal(change?.payload.type === "duration" ? change.payload.durationSeconds : 0, 480);
    assert.equal(change?.after, "8 min");
  });

  it("proposes vidIQ images for the current thumbnail prompts", () => {
    const change = projectChangeFromTool(
      "generateThumbnailImages",
      { images: [{ id: "thumb-1", url: "https://cdn.example/thumb.png" }, { id: "bad", url: "not-a-url" }] },
      context,
      "call-8",
    );
    assert.equal(change?.tool, "generateThumbnailImages");
    assert.equal(change?.field, "thumbnail");
    assert.deepEqual(change?.payload.type === "thumbnailImages" ? change.payload.images : [], [
      { id: "thumb-1", url: "https://cdn.example/thumb.png" },
    ]);
  });

  it("rejects a tool call without the required text", () => {
    assert.equal(projectChangeFromTool("setBrief", { topic: "   " }, context, "call-2"), null);
  });
});
