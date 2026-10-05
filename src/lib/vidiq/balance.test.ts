import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { quotaFromVidiqBalance } from "./balance";

describe("vidIQ credit quota", () => {
  it("treats totalCredits as remaining and derives used from the cap", () => {
    const quota = quotaFromVidiqBalance({
      type: "limited",
      totalCredits: 1828,
      maxRenewableCredits: 2000,
      maxAddOnCredits: 700,
      renewableResetsAt: "2026-10-16T14:02:07Z",
    });
    assert.equal(quota.plan, "Limited");
    assert.equal(quota.remaining, 1828);
    assert.equal(quota.limit, 2700);
    assert.equal(quota.used, 872);
    assert.equal(quota.resetsAt?.toISOString(), "2026-10-16T14:02:07.000Z");
  });
});
