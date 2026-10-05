import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizeCursorScript,
  parseCursorScriptRequest,
  scriptFixNotice,
} from "./contract";
import { formatScriptSections, timelineSectionsFromScript } from "@/lib/scriptSections";
import { applyScriptPromptVariables } from "@/features/cursor-title-generator/prompt";

const request = {
  topic: "How compound interest works",
  title: "The quiet math behind every fortune",
  length: "8 min",
  orientation: "Long form (16:9)",
  videoType: "Educational",
  durationSeconds: 480,
  references: [],
};

describe("cursor script contract", () => {
  it("points a missing introduction or title at the step that owns it", () => {
    assert.equal(scriptFixNotice({ ...request, durationSeconds: 480 }), null);
    assert.deepEqual(scriptFixNotice({ ...request, topic: "  ", durationSeconds: 480 }), {
      step: "summary",
      title: "No topic or idea",
      message: "Add a topic or idea there, then generate the script.",
    });
    assert.equal(scriptFixNotice({ ...request, length: "", durationSeconds: 0 })?.title, "No video length");
    assert.deepEqual(scriptFixNotice({ ...request, title: "", durationSeconds: 480 }), {
      step: "title",
      title: "No title selected",
      message: "Select a title there, then generate the script.",
    });
    const both = scriptFixNotice({ ...request, topic: "", title: "", durationSeconds: 480 });
    assert.equal(both?.step, "summary");
    assert.match(both?.message ?? "", /step 2/);
  });

  it("requires the video introduction and the selected title", () => {
    assert.equal(parseCursorScriptRequest({ ...request, title: "  " }), null);
    assert.equal(parseCursorScriptRequest({ ...request, topic: "" }), null);
    assert.deepEqual(parseCursorScriptRequest(request), request);
  });

  it("keeps a timeline-ready section list and drops a set the timeline cannot split", () => {
    const sections = normalizeCursorScript(
      {
        sections: [
          { label: "hook", durationSeconds: 6, script: "You already know the ending." },
          { label: "POINT 1 — The quiet math", durationSeconds: 14, script: "One percent, repeated." },
          { label: "CTA", durationSeconds: 6, script: "Write the number down." },
          { label: "Outro", durationSeconds: 4, script: "That is the whole trick." },
        ],
      },
      30,
    );
    assert.ok(sections);
    assert.equal(sections[0]?.label, "HOOK");
    assert.deepEqual(
      sections.map((section) => section.durationSeconds),
      [6, 14, 6, 4],
    );
    const script = formatScriptSections(sections);
    assert.match(script, /HOOK\nDuration: 6 sec\nYou already know the ending\./);
    const parsed = timelineSectionsFromScript(script);
    assert.deepEqual(
      parsed?.map((section) => section.label),
      ["HOOK", "POINT 1 — The quiet math", "CTA", "OUTRO"],
    );
    assert.deepEqual(
      parsed?.map((section) => section.durationSeconds),
      [6, 14, 6, 4],
    );
    assert.equal(parsed?.[0]?.body.includes("Duration"), false);
    assert.equal(normalizeCursorScript({ sections: sections.slice(0, 3) }, 30), null);
    assert.equal(
      normalizeCursorScript(
        {
          sections: [
            { label: "INTRO", durationSeconds: 5, script: "Too late." },
            { label: "POINT 1", durationSeconds: 10, script: "Middle." },
            { label: "CTA", durationSeconds: 5, script: "Ask." },
            { label: "OUTRO", durationSeconds: 10, script: "End." },
          ],
        },
        30,
      ),
      null,
    );
    assert.deepEqual(
      normalizeCursorScript(
        {
          sections: [
            { label: "HOOK", durationSeconds: 8, script: "Open." },
            { label: "POINT 1", durationSeconds: 12, script: "Middle." },
            { label: "CTA", durationSeconds: 6, script: "Ask." },
            { label: "OUTRO", durationSeconds: 10, script: "Close." },
          ],
        },
        30,
      )?.map((section) => section.durationSeconds),
      [7, 10, 5, 8],
    );
  });

  it("fills every script token and appends any the template dropped", () => {
    const filled = applyScriptPromptVariables("Write about {{title}}.", request);
    assert.match(filled, /The quiet math behind every fortune/);
    assert.match(filled, /Topic \/ idea:\nHow compound interest works/);
    assert.match(filled, /Length:\n8 min/);
    assert.match(filled, /Orientation:\nLong form \(16:9\)/);
    assert.match(filled, /Video type:\nEducational/);
    assert.match(filled, /Reference videos:\nNone/);
    const withReference = applyScriptPromptVariables("Refs:\n{{references}}", {
      ...request,
      references: [{ title: "Why debt compounds", transcript: "Interest quietly stacks." }],
    });
    assert.match(withReference, /Why debt compounds/);
    assert.match(withReference, /Interest quietly stacks\./);
  });
});
