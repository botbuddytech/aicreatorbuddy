import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isOwnedSceneClipPath,
  sceneClipObjectPath,
} from "./sceneClipPath";

const sessionId = "05d5f122-3f7c-4cb7-9509-1745010e680a";
const sceneId = "11111111-1111-4111-8111-111111111111";

describe("scene clip paths", () => {
  it("keeps a clip inside its session and scene", () => {
    const path = sceneClipObjectPath(sessionId, sceneId, "clip_abc12345", "mp4");
    assert.equal(isOwnedSceneClipPath(sessionId, sceneId, path), true);
    assert.equal(isOwnedSceneClipPath(sessionId, "22222222-2222-4222-8222-222222222222", path), false);
    assert.equal(isOwnedSceneClipPath(sessionId, sceneId, `${sessionId}/${sceneId}/../secret.mp4`), false);
  });
});
