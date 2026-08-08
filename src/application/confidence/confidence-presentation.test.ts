import { describe, expect, it } from "vitest";

import type { ConfidencePillarResult, ConfidenceSignal } from "./confidence-calculations";
import { buildScoreExplanation, computeCompleteness, selectNegativeSignals, selectPositiveSignals, toHistoryPoint } from "./confidence-presentation";

function makeSignal(overrides: Partial<ConfidenceSignal> = {}): ConfidenceSignal {
  return {
    id: "test.signal",
    pillar: "cashFlow",
    label: "Test Signal",
    status: "available",
    score: 80,
    polarity: "positive",
    reasonCode: "TEST_REASON",
    message: "Test message.",
    ...overrides,
  };
}

function makePillar(overrides: Partial<ConfidencePillarResult> = {}): ConfidencePillarResult {
  return {
    id: "cashFlow",
    label: "Cash Flow",
    weight: 0.2,
    status: "available",
    score: 80,
    effectiveWeight: 0.2,
    signals: [],
    ...overrides,
  };
}

describe("computeCompleteness", () => {
  it("counts available vs total pillars and sums raw spec weight for available ones", () => {
    const pillars = [
      makePillar({ id: "cashFlow", weight: 0.2, status: "available" }),
      makePillar({ id: "resilience", weight: 0.2, status: "available" }),
      makePillar({ id: "debtHealth", weight: 0.15, status: "unavailable", score: null }),
    ];

    const completeness = computeCompleteness(pillars);

    expect(completeness.availablePillars).toBe(2);
    expect(completeness.totalPillars).toBe(3);
    expect(completeness.coveredWeightPercent).toBeCloseTo(40, 10);
    expect(completeness.unavailablePillars).toHaveLength(1);
    expect(completeness.unavailablePillars[0].id).toBe("debtHealth");
  });

  it("reports 0% coverage when every pillar is unavailable", () => {
    const completeness = computeCompleteness([makePillar({ status: "unavailable", score: null })]);
    expect(completeness.coveredWeightPercent).toBe(0);
    expect(completeness.availablePillars).toBe(0);
  });

  it("reports full coverage when every pillar is available", () => {
    const completeness = computeCompleteness([
      makePillar({ weight: 0.6, status: "available" }),
      makePillar({ weight: 0.4, status: "available" }),
    ]);
    expect(completeness.coveredWeightPercent).toBeCloseTo(100, 10);
  });
});

describe("selectPositiveSignals / selectNegativeSignals", () => {
  it("selects only signals with the matching polarity", () => {
    const pillars = [
      makePillar({
        signals: [
          makeSignal({ id: "a", polarity: "positive", score: 90 }),
          makeSignal({ id: "b", polarity: "negative", score: 10 }),
          makeSignal({ id: "c", polarity: "neutral", score: 50 }),
          makeSignal({ id: "d", polarity: "unavailable", score: null }),
        ],
      }),
    ];

    expect(selectPositiveSignals(pillars).map((s) => s.id)).toEqual(["a"]);
    expect(selectNegativeSignals(pillars).map((s) => s.id)).toEqual(["b"]);
  });

  it("orders positive signals by distance from the neutral midpoint, strongest first", () => {
    const pillars = [
      makePillar({
        signals: [
          makeSignal({ id: "mild", polarity: "positive", score: 60 }),
          makeSignal({ id: "strong", polarity: "positive", score: 98 }),
          makeSignal({ id: "moderate", polarity: "positive", score: 78 }),
        ],
      }),
    ];

    expect(selectPositiveSignals(pillars).map((s) => s.id)).toEqual(["strong", "moderate", "mild"]);
  });

  it("orders negative signals by distance from the neutral midpoint, strongest first (lowest score first)", () => {
    const pillars = [
      makePillar({
        signals: [
          makeSignal({ id: "mild", polarity: "negative", score: 40 }),
          makeSignal({ id: "severe", polarity: "negative", score: 2 }),
          makeSignal({ id: "moderate", polarity: "negative", score: 22 }),
        ],
      }),
    ];

    expect(selectNegativeSignals(pillars).map((s) => s.id)).toEqual(["severe", "moderate", "mild"]);
  });

  it("gathers signals across every pillar, not just the first", () => {
    const pillars = [
      makePillar({ id: "cashFlow", signals: [makeSignal({ id: "a", pillar: "cashFlow", polarity: "positive", score: 90 })] }),
      makePillar({ id: "savings", signals: [makeSignal({ id: "b", pillar: "savings", polarity: "positive", score: 70 })] }),
    ];

    expect(selectPositiveSignals(pillars).map((s) => s.id).sort()).toEqual(["a", "b"]);
  });

  it("returns an empty array (not an error) when there are no signals of that polarity", () => {
    const pillars = [makePillar({ signals: [makeSignal({ polarity: "neutral" })] })];
    expect(selectPositiveSignals(pillars)).toEqual([]);
    expect(selectNegativeSignals(pillars)).toEqual([]);
  });
});

describe("buildScoreExplanation", () => {
  it("returns null (never a fabricated sentence) when there is no overall score", () => {
    expect(buildScoreExplanation(null, null, [])).toBeNull();
  });

  it("returns null when there are no available pillars, even if overallScore is somehow set", () => {
    const pillars = [makePillar({ status: "unavailable", score: null })];
    expect(buildScoreExplanation(50, { id: "building", label: "Building" }, pillars)).toBeNull();
  });

  it("names the strongest and weakest available pillars by score", () => {
    const pillars = [
      makePillar({ id: "cashFlow", label: "Cash Flow", score: 90, status: "available" }),
      makePillar({ id: "debtHealth", label: "Debt Health", score: 20, status: "available" }),
      makePillar({ id: "savings", label: "Savings", score: 60, status: "available" }),
    ];

    const explanation = buildScoreExplanation(65, { id: "building", label: "Building" }, pillars);

    expect(explanation).toContain("65");
    expect(explanation).toContain("Building");
    expect(explanation).toContain("Cash Flow");
    expect(explanation).toContain("Debt Health");
  });

  it("names only the one pillar when just a single pillar is available", () => {
    const pillars = [makePillar({ id: "cashFlow", label: "Cash Flow", score: 70, status: "available" })];
    const explanation = buildScoreExplanation(70, { id: "stable", label: "Stable" }, pillars);
    expect(explanation).toContain("Cash Flow");
    expect(explanation).toContain("only pillar");
  });

  it("does not reference a second pillar when the strongest and weakest happen to be the same pillar", () => {
    const pillars = [makePillar({ id: "cashFlow", label: "Cash Flow", score: 70, status: "available" })];
    const explanation = buildScoreExplanation(70, { id: "stable", label: "Stable" }, pillars);
    // "Cash Flow" should appear exactly once, not once as "strongest" and
    // again as "weakest".
    expect(explanation?.match(/Cash Flow/g)).toHaveLength(1);
  });
});

describe("toHistoryPoint", () => {
  it("derives the band from the score using the same bandForScore function the live calculation uses", () => {
    const point = toHistoryPoint("2026-07-31", 90);
    expect(point.band?.label).toBe("Strong");
    expect(point.snapshotDate).toBe("2026-07-31");
  });

  it("leaves band null when the score is null — never a fabricated band for an unmeasured point", () => {
    const point = toHistoryPoint("2026-07-31", null);
    expect(point.band).toBeNull();
    expect(point.overallScore).toBeNull();
  });
});
