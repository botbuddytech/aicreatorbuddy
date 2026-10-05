import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectCaptionLanguage } from "./transcript";

describe("selectCaptionLanguage", () => {
  it("prefers English when YouTube lists a translation first", () => {
    assert.equal(
      selectCaptionLanguage(["ar", "bn", "en", "hi", "ur"]),
      "en",
    );
  });

  it("uses a regional English track when plain English is missing", () => {
    assert.equal(selectCaptionLanguage(["ar", "en-US", "hi"]), "en-US");
    assert.equal(selectCaptionLanguage(["fr-FR", "en-GB"]), "en-GB");
  });

  it("honors an explicit language request", () => {
    assert.equal(
      selectCaptionLanguage(["ar", "en", "hi"], { requested: "hi" }),
      "hi",
    );
    assert.equal(
      selectCaptionLanguage(["en", "fr-FR"], { requested: "fr" }),
      "fr-FR",
    );
  });

  it("returns null when the requested language is not available", () => {
    assert.equal(
      selectCaptionLanguage(["en", "hi"], { requested: "ja" }),
      null,
    );
  });

  it("falls back to the video default when English captions are absent", () => {
    assert.equal(
      selectCaptionLanguage(["ar", "hi"], { defaultCode: "hi" }),
      "hi",
    );
  });
});
