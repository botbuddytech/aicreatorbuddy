import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { exportFileName, nextExportVersion, sanitizeExportTitle } from "./exportFileName";

describe("export file name", () => {
  const exportedAt = new Date(2026, 9, 9, 12);

  it("builds title, version, and export date", () => {
    assert.equal(
      exportFileName({
        title: "How to Draft an Affidavit!",
        exportCount: 0,
        exportedAt,
      }),
      "How-to-Draft-an-Affidavit-v1-2026-10-09.mp4",
    );
  });

  it("uses the next version after the stored export count", () => {
    assert.equal(nextExportVersion(0), 1);
    assert.equal(nextExportVersion(2), 3);
    assert.equal(
      exportFileName({ title: "test 1", exportCount: 2, exportedAt, extension: "md" }),
      "test-1-v3-2026-10-09.md",
    );
  });

  it("falls back when the title has no safe characters", () => {
    assert.equal(sanitizeExportTitle("   !!!   "), "video");
    assert.equal(
      exportFileName({ title: "???", exportCount: 0, exportedAt }),
      "video-v1-2026-10-09.mp4",
    );
  });
});
