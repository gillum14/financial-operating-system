import { describe, expect, it } from "vitest";

import type { ConfidenceResult } from "./confidence-calculations";
import { computeConfidenceTrend, selectComparisonSnapshot, toPillarScoresRecord, type StoredConfidenceSnapshot } from "./confidence-history-calculations";

function makeResult(overallScore: number | null, pillarScores: Record<string, number | null>): ConfidenceResult {
  return {
    asOf: new Date("2026-08-07T00:00:00Z"),
    overallScore,
    band: overallScore === null ? null : { id: "stable", label: "Stable" },
    pillars: Object.entries(pillarScores).map(([id, score]) => ({
      id: id as ConfidenceResult["pillars"][number]["id"],
      label: id,
      weight: 0.1,
      status: score === null ? "unavailable" : "available",
      score,
      effectiveWeight: score === null ? 0 : 0.1,
      signals: [],
    })),
  };
}

function makeSnapshot(snapshotDate: string, overallScore: number | null, pillarScores: Record<string, number | null>): StoredConfidenceSnapshot {
  return { snapshotDate, overallScore, pillarScores };
}

describe("selectComparisonSnapshot", () => {
  it("returns the most recent (last, ascending) snapshot", () => {
    const snapshots = [makeSnapshot("2026-06-30", 70, {}), makeSnapshot("2026-07-31", 75, {})];
    expect(selectComparisonSnapshot(snapshots)?.snapshotDate).toBe("2026-07-31");
  });

  it("returns null when there is no history yet — the honest 'first snapshot establishes baseline' state", () => {
    expect(selectComparisonSnapshot([])).toBeNull();
  });
});

describe("computeConfidenceTrend", () => {
  it("returns null (not a fabricated zero-change) when there is no comparison snapshot", () => {
    const current = makeResult(80, { cashFlow: 80 });
    expect(computeConfidenceTrend(current, null)).toBeNull();
  });

  it("computes a real overall score delta against the stored comparison snapshot", () => {
    const current = makeResult(85, { cashFlow: 90 });
    const comparison = makeSnapshot("2026-07-31", 80, { cashFlow: 85 });
    const trend = computeConfidenceTrend(current, comparison);
    expect(trend?.overallChange).toEqual({ comparisonDate: "2026-07-31", absoluteChange: 5 });
  });

  it("computes a negative delta when the score declined", () => {
    const current = makeResult(70, { cashFlow: 60 });
    const comparison = makeSnapshot("2026-07-31", 80, { cashFlow: 75 });
    const trend = computeConfidenceTrend(current, comparison);
    expect(trend?.overallChange?.absoluteChange).toBe(-10);
  });

  it("computes deterministic per-pillar change attribution for pillars present in both points", () => {
    const current = makeResult(80, { cashFlow: 90, debtHealth: 60 });
    const comparison = makeSnapshot("2026-07-31", 75, { cashFlow: 80, debtHealth: 70 });
    const trend = computeConfidenceTrend(current, comparison);
    expect(trend?.pillarChanges.cashFlow).toEqual({ comparisonDate: "2026-07-31", absoluteChange: 10 });
    expect(trend?.pillarChanges.debtHealth).toEqual({ comparisonDate: "2026-07-31", absoluteChange: -10 });
  });

  it("omits (does not fabricate) a pillar's change when it is unavailable in the current result", () => {
    const current = makeResult(80, { cashFlow: null });
    const comparison = makeSnapshot("2026-07-31", 75, { cashFlow: 80 });
    const trend = computeConfidenceTrend(current, comparison);
    expect(trend?.pillarChanges.cashFlow).toBeUndefined();
  });

  it("omits a pillar's change when it was unavailable at the comparison snapshot ('where supported')", () => {
    const current = makeResult(80, { cashFlow: 90 });
    const comparison = makeSnapshot("2026-07-31", 75, { cashFlow: null });
    const trend = computeConfidenceTrend(current, comparison);
    expect(trend?.pillarChanges.cashFlow).toBeUndefined();
  });

  it("leaves overallChange null when either point's overall score is null, never approximating from partial pillar data", () => {
    const current = makeResult(null, { cashFlow: 50 });
    const comparison = makeSnapshot("2026-07-31", 75, { cashFlow: 60 });
    const trend = computeConfidenceTrend(current, comparison);
    expect(trend?.overallChange).toBeNull();
  });
});

describe("toPillarScoresRecord", () => {
  it("captures every pillar id's current score, including nulls for unavailable pillars", () => {
    const result = makeResult(80, { cashFlow: 90, resilience: null, debtHealth: 70 });
    const record = toPillarScoresRecord(result);
    expect(record.cashFlow).toBe(90);
    expect(record.resilience).toBeNull();
    expect(record.debtHealth).toBe(70);
  });
});
