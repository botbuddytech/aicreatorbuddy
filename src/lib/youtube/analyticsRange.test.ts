import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { asAnalyticsRange, LIFETIME_START, monthQueryBounds, rangeWindow } from "./analyticsRange";
import { bucketSeries } from "./chartSeries";

describe("analytics ranges", () => {
  const end = new Date("2026-10-08T00:00:00.000Z");

  it("defaults an unknown range to 28 days and accepts all time", () => {
    assert.equal(asAnalyticsRange(null), "28d");
    assert.equal(asAnalyticsRange("all"), "all");
    assert.equal(asAnalyticsRange("7d"), "7d");
  });

  it("builds a 7-day window and the previous 7 days", () => {
    const window = rangeWindow("7d", end);
    assert.equal(window.grain, "day");
    assert.equal(window.end.toISOString().slice(0, 10), "2026-10-08");
    assert.equal(window.start.toISOString().slice(0, 10), "2026-10-02");
    assert.equal(window.previousEnd?.toISOString().slice(0, 10), "2026-10-01");
    assert.equal(window.previousStart?.toISOString().slice(0, 10), "2026-09-25");
  });

  it("uses monthly points from YouTube's earliest data for all time", () => {
    const window = rangeWindow("all", end);
    assert.equal(window.grain, "month");
    assert.equal(window.start.toISOString().slice(0, 10), LIFETIME_START);
    assert.equal(window.previousStart, null);
    assert.equal(window.previousEnd, null);
  });

  it("aligns month reports to the first and last day of a month", () => {
    const bounds = monthQueryBounds(new Date(`${LIFETIME_START}T00:00:00.000Z`), end);
    assert.equal(bounds.start.toISOString().slice(0, 10), "2005-02-01");
    assert.equal(bounds.end.toISOString().slice(0, 10), "2026-09-01");
    assert.equal(bounds.partialStart?.toISOString().slice(0, 10), "2026-10-01");
    assert.equal(bounds.partialEnd?.toISOString().slice(0, 10), "2026-10-08");
  });
  it("uses months for the last 12 months", () => {
    const window = rangeWindow("1y", end);
    assert.equal(window.grain, "month");
    assert.equal(window.start.toISOString().slice(0, 10), "2025-10-09");
  });
});

describe("bucketSeries", () => {
  it("keeps a short daily range and sums longer ranges into 12 points", () => {
    const week = bucketSeries(
      ["2026-10-02", "2026-10-03", "2026-10-04"],
      [2, 3, 4],
    );
    assert.deepEqual(week.values, [2, 3, 4]);
    assert.equal(week.labels[0], "Oct 2");

    const dates = Array.from({ length: 24 }, (_, index) => `2024-${String((index % 12) + 1).padStart(2, "0")}`);
    const summed = bucketSeries(dates, Array.from({ length: 24 }, () => 10));
    assert.equal(summed.values.length, 12);
    assert.equal(summed.values[0], 20);
  });
});
