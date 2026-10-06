import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DEFAULT_VOICE_ID, isQwenVoiceId, parseVoiceList, qwenVoiceId, readSpeakRequest } from "./contract";

describe("qwen contract", () => {
  it("accepts the built-in speakers only", () => {
    assert.equal(isQwenVoiceId("Ryan"), true);
    assert.equal(isQwenVoiceId("Uncle_Fu"), true);
    assert.equal(isQwenVoiceId("../secrets"), false);
    assert.equal(isQwenVoiceId("My-Voice.wav"), false);
  });

  it("falls back to Ryan when the saved voice is not a Qwen speaker", () => {
    assert.equal(
      qwenVoiceId({ provider: "chatterbox", voiceId: "default" }),
      DEFAULT_VOICE_ID,
    );
    assert.equal(qwenVoiceId({ provider: "qwen", voiceId: "Aiden" }), "Aiden");
  });

  it("rejects an empty speak request", () => {
    assert.deepEqual(readSpeakRequest({ text: "  Hello   there ", voiceId: "Ryan" }), {
      text: "Hello there",
      voiceId: "Ryan",
    });
    assert.equal("error" in readSpeakRequest({ text: "   ", voiceId: "Ryan" }), true);
  });

  it("keeps Ryan in a list that omitted it", () => {
    assert.deepEqual(parseVoiceList({ voices: [{ id: "Aiden", name: "Aiden (English)" }] }), [
      { id: "Ryan", name: "Ryan (English)" },
      { id: "Aiden", name: "Aiden (English)" },
    ]);
    assert.equal(parseVoiceList({ voices: [{ id: "nope.wav", name: "Nope" }] }), null);
  });
});
