import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { selectedPublishTitle, selectedThumbnailUrl } from "./readyPresentation";

describe("ready presentation", () => {
  it("prefers the selected YouTube title over the project name", () => {
    assert.equal(
      selectedPublishTitle(
        { selectedTitle: "Why Oracle’s Stock Dropped" },
        { titles: [{ id: "t1", text: "Other" }], selectedTitleId: "t1" },
      ),
      "Why Oracle’s Stock Dropped",
    );
  });

  it("reads the selected title from the step payload", () => {
    assert.equal(
      selectedPublishTitle(null, {
        titles: [
          { id: "a", text: "First" },
          { id: "b", text: "Chosen title" },
        ],
        selectedTitleId: "b",
      }),
      "Chosen title",
    );
  });

  it("reads the selected thumbnail url", () => {
    assert.equal(
      selectedThumbnailUrl({
        thumbnails: [
          { id: "a", customUrl: "https://cdn.example/a.jpg" },
          { id: "b", customUrl: "https://cdn.example/b.jpg" },
        ],
        selectedThumbnailId: "b",
      }),
      "https://cdn.example/b.jpg",
    );
  });
});
