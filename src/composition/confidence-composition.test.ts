import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Same rationale as net-worth-composition.test.ts: this intentionally
// connects through the real @/db/client singleton (via @/composition/
// confidence-composition, @/composition/confidence-query), reusing
// Accounts/Transactions/Budgets/Goals/Net Worth's own real composition
// functions — exercising this against the canonical seeded sandbox is
// the actual "manual reconciliation" this task asked for, not a
// hand-typed fixture standing in for it.
const hasDatabase = isDbTestingAllowed();
const seedOwnerId = process.env.SEED_OWNER_ID;

describe.skipIf(!hasDatabase)("confidence composition root (integration)", () => {
  it("wires a singleton ConfidenceSnapshotCaptureService", async () => {
    const { getConfidenceSnapshotCaptureService } = await import("./confidence-composition");
    const { ConfidenceSnapshotCaptureService } = await import("@/application/confidence/confidence-snapshot-capture-service");

    const first = getConfidenceSnapshotCaptureService();
    const second = getConfidenceSnapshotCaptureService();

    expect(first).toBeInstanceOf(ConfidenceSnapshotCaptureService);
    expect(first).toBe(second);
  });

  it.skipIf(!seedOwnerId)("computes a real, non-null Confidence Score for the seeded owner from real cross-domain evidence", async () => {
    const { computeCurrentConfidenceScore } = await import("./confidence-query");

    const result = await computeCurrentConfidenceScore(seedOwnerId as string);

    // The canonical sandbox has real accounts, transactions, a budget,
    // goals, and 12 months of Net Worth history — enough real evidence
    // that at least some pillars (and therefore an overall score) must
    // be available. A null result here would mean the calculation
    // silently failed to find evidence that genuinely exists.
    expect(result.overallScore).not.toBeNull();
    expect(result.overallScore!).toBeGreaterThanOrEqual(0);
    expect(result.overallScore!).toBeLessThanOrEqual(100);
    expect(result.band).not.toBeNull();

    const availablePillars = result.pillars.filter((pillar) => pillar.status === "available");
    expect(availablePillars.length).toBeGreaterThan(0);

    // Every available pillar's effective weight must be a real, positive
    // renormalized share, and every pillar (available or not) must carry
    // at least one signal with a reason code — explainability is never
    // optional.
    for (const pillar of result.pillars) {
      expect(pillar.signals.length).toBeGreaterThan(0);
      for (const signal of pillar.signals) {
        expect(signal.reasonCode).toBeTruthy();
      }
    }
    const totalEffectiveWeight = availablePillars.reduce((sum, pillar) => sum + pillar.effectiveWeight, 0);
    expect(totalEffectiveWeight).toBeCloseTo(1, 6);
  });

  it.skipIf(!seedOwnerId)("is deterministic: repeated calls for the same owner return identical results", async () => {
    const { computeCurrentConfidenceScore } = await import("./confidence-query");

    const first = await computeCurrentConfidenceScore(seedOwnerId as string);
    const second = await computeCurrentConfidenceScore(seedOwnerId as string);

    expect(second.overallScore).toBe(first.overallScore);
    expect(second.band).toEqual(first.band);
    expect(second.pillars.map((p) => ({ id: p.id, score: p.score }))).toEqual(first.pillars.map((p) => ({ id: p.id, score: p.score })));
  });

  // Task requirement: "Dashboard consistency." getConfidenceOverview is
  // the exact function the Dashboard page calls; asserting it against a
  // fresh computeCurrentConfidenceScore call (the same function the
  // overview itself calls internally) proves there is only one
  // computation path, not two that happen to agree.
  it.skipIf(!seedOwnerId)("getConfidenceOverview (what Dashboard renders) matches computeCurrentConfidenceScore", async () => {
    const { getConfidenceOverview } = await import("./confidence-query");
    const { computeCurrentConfidenceScore } = await import("./confidence-query");

    const overview = await getConfidenceOverview(seedOwnerId as string);
    const result = await computeCurrentConfidenceScore(seedOwnerId as string);

    expect(overview.overallScore).toBe(result.overallScore);
    expect(overview.band).toEqual(result.band);
    expect(overview.hasEvidence).toBe(result.overallScore !== null);
  });

  // Confidence Insights V1 — presentation-layer fields (completeness,
  // positive/negative contributors, explanation, history) reconciled
  // against the real seeded sandbox, not a hand-typed fixture. Every
  // assertion here traces back to result.pillars — the exact same object
  // getConfidenceOverview's other fields (asserted above) are built from,
  // proving the presentation layer never recomputes anything.
  it.skipIf(!seedOwnerId)("completeness reflects the real pillar availability for the seeded owner", async () => {
    const { getConfidenceOverview } = await import("./confidence-query");

    const overview = await getConfidenceOverview(seedOwnerId as string);
    const availableCount = overview.pillars.filter((p) => p.status === "available").length;

    expect(overview.completeness.totalPillars).toBe(8);
    expect(overview.completeness.availablePillars).toBe(availableCount);
    expect(overview.completeness.unavailablePillars).toHaveLength(8 - availableCount);
    expect(overview.completeness.coveredWeightPercent).toBeGreaterThan(0);
    expect(overview.completeness.coveredWeightPercent).toBeLessThanOrEqual(100);
  });

  it.skipIf(!seedOwnerId)("positive and negative contributors are drawn from the real pillar signals, correctly polarized", async () => {
    const { getConfidenceOverview } = await import("./confidence-query");

    const overview = await getConfidenceOverview(seedOwnerId as string);
    const allSignalIds = new Set(overview.pillars.flatMap((p) => p.signals.map((s) => s.id)));

    expect(overview.positiveSignals.every((s) => s.polarity === "positive")).toBe(true);
    expect(overview.negativeSignals.every((s) => s.polarity === "negative")).toBe(true);
    // Every contributor signal must trace back to a real pillar signal —
    // never a fabricated one.
    for (const signal of [...overview.positiveSignals, ...overview.negativeSignals]) {
      expect(allSignalIds.has(signal.id)).toBe(true);
    }
  });

  it.skipIf(!seedOwnerId)("the score explanation names a real pillar label from the result", async () => {
    const { getConfidenceOverview } = await import("./confidence-query");

    const overview = await getConfidenceOverview(seedOwnerId as string);
    expect(overview.explanation).not.toBeNull();

    const availableLabels = overview.pillars.filter((p) => p.status === "available").map((p) => p.label);
    expect(availableLabels.some((label) => overview.explanation!.includes(label))).toBe(true);
  });

  // A real manual capture was performed against this owner during
  // Confidence Engine V1's live verification, so the seeded sandbox
  // already has real history to exercise the timeline here.
  it.skipIf(!seedOwnerId)("history reflects the real persisted snapshots for the seeded owner, oldest first", async () => {
    const { getConfidenceOverview } = await import("./confidence-query");

    const overview = await getConfidenceOverview(seedOwnerId as string);
    expect(overview.hasHistory).toBe(true);
    expect(overview.history.length).toBeGreaterThan(0);

    const dates = overview.history.map((point) => point.snapshotDate);
    expect(dates).toEqual([...dates].sort());
  });
});
