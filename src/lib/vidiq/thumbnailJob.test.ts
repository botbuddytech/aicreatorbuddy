import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readJobId, readJobStatus, readThumbnailImage, sniffImageType } from "./thumbnailJob";

describe("vidIQ thumbnail job", () => {
  it("reads the job id and completed image url", () => {
    const started = { mcpJobId: "job_1", status: "inprogress" };
    assert.equal(readJobId(started), "job_1");
    assert.equal(readJobStatus(started), "inprogress");

    const done = {
      status: "completed",
      result: { imageUrl: "https://cdn.example/thumb.png", score: 70 },
    };
    assert.equal(readJobStatus(done), "completed");
    assert.deepEqual(readThumbnailImage(done), {
      kind: "url",
      url: "https://cdn.example/thumb.png",
    });
  });

  it("reads an inline image and sniffs png bytes", () => {
    const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const payload = {
      status: "completed",
      mcpContent: [{ type: "image", data: png.toString("base64"), mimeType: "image/png" }],
    };
    const image = readThumbnailImage(payload);
    assert.equal(image?.kind, "bytes");
    assert.equal(sniffImageType(png, "application/octet-stream"), "image/png");
  });
});
