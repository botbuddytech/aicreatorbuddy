import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { pickUploadChannelId } from "./pickUploadChannel";

const channels = [
  { id: "active", status: "ACTIVE" },
  { id: "other", status: "ACTIVE" },
  { id: "stale", status: "NEEDS_REAUTH" },
];

describe("pickUploadChannelId", () => {
  it("uses the selected connected channel", () => {
    assert.equal(
      pickUploadChannelId({
        selectedChannelId: "other",
        projectChannelId: "active",
        activeChannelId: "active",
        channels,
      }),
      "other",
    );
  });

  it("skips a project channel that is not connected and uses the selected channel", () => {
    assert.equal(
      pickUploadChannelId({
        projectChannelId: "missing",
        activeChannelId: "active",
        channels,
      }),
      "active",
    );
  });

  it("skips a channel that needs reconnect", () => {
    assert.equal(
      pickUploadChannelId({
        selectedChannelId: "stale",
        activeChannelId: "other",
        channels,
      }),
      "other",
    );
  });

  it("returns null when nothing is connected", () => {
    assert.equal(
      pickUploadChannelId({
        selectedChannelId: "stale",
        channels: [{ id: "stale", status: "NEEDS_REAUTH" }],
      }),
      null,
    );
  });
});
