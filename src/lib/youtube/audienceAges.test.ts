import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { groupAudienceAges } from "./audienceAges";

describe("groupAudienceAges", () => {
  it("folds 45 and older into one band and names the largest group", () => {
    const grouped = groupAudienceAges([
      { label: "18–24", value: 34 },
      { label: "25–34", value: 41 },
      { label: "35–44", value: 18 },
      { label: "45–54", value: 4 },
      { label: "55–64", value: 2 },
      { label: "65–", value: 1 },
    ]);

    assert.deepEqual(
      grouped.segments.map((segment) => [segment.label, segment.value]),
      [
        ["18–24 years", 34],
        ["25–34 years", 41],
        ["35–44 years", 18],
        ["45+ years", 7],
      ],
    );
    assert.equal(grouped.primary, "25–34 years");
  });

  it("keeps 13–17 separate when YouTube returns teen viewers", () => {
    const grouped = groupAudienceAges([
      { label: "age13-17", value: 12 },
      { label: "age18-24", value: 40 },
      { label: "age25-34", value: 48 },
    ]);

    assert.equal(grouped.segments[0]?.label, "13–17 years");
    assert.equal(grouped.segments[0]?.value, 12);
    assert.equal(grouped.primary, "25–34 years");
    assert.equal(
      grouped.segments.reduce((sum, segment) => sum + segment.value, 0),
      100,
    );
  });

  it("returns no segments when age data is missing", () => {
    assert.deepEqual(groupAudienceAges([]), { segments: [], primary: null });
  });
});
