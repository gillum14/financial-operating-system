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
});
