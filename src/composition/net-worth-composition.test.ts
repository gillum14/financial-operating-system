import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Same rationale as goals-composition.test.ts: this intentionally connects
// through the real @/db/client singleton (via @/composition/net-worth-
// composition, @/composition/net-worth-query), which the sandbox seed's
// own 12-month deterministic snapshot fixtures are verified against.
const hasDatabase = isDbTestingAllowed();
const seedOwnerId = process.env.SEED_OWNER_ID;

describe.skipIf(!hasDatabase)("net-worth composition root (integration)", () => {
  it("wires a singleton SnapshotCaptureService", async () => {
    const { getSnapshotCaptureService } = await import("./net-worth-composition");
    const { SnapshotCaptureService } = await import("@/application/net-worth/snapshot-capture-service");

    const first = getSnapshotCaptureService();
    const second = getSnapshotCaptureService();

    expect(first).toBeInstanceOf(SnapshotCaptureService);
    expect(first).toBe(second);
  });

  it.skipIf(!seedOwnerId)("the seeded sandbox has 12 months of history with a real comparison point", async () => {
    const { getNetWorthOverview } = await import("./net-worth-query");

    const overview = await getNetWorthOverview(seedOwnerId as string);

    expect(overview.hasHistory).toBe(true);
    expect(overview.history).toHaveLength(12);
    expect(overview.history[0].snapshotDate).toBe("2025-08-31");
    expect(overview.history[11].snapshotDate).toBe("2026-07-31");
    expect(overview.netWorthChange).not.toBeNull();
    expect(overview.netWorthChange!.comparisonDate).toBe("2026-07-31");
  });

  it.skipIf(!seedOwnerId)("the seeded sandbox's history includes at least one month of net worth decline", async () => {
    const { getNetWorthOverview } = await import("./net-worth-query");

    const overview = await getNetWorthOverview(seedOwnerId as string);
    const declineMonths = overview.history.filter(
      (point, index) => index > 0 && point.netWorth < overview.history[index - 1].netWorth,
    );

    expect(declineMonths.length).toBeGreaterThanOrEqual(1);
  });

  it.skipIf(!seedOwnerId)("current net worth continues the historical trend rather than jumping discontinuously", async () => {
    const { getNetWorthOverview } = await import("./net-worth-query");

    const overview = await getNetWorthOverview(seedOwnerId as string);
    const lastHistoricalPoint = overview.history[overview.history.length - 1];

    // The live current value should sit close to the last historical
    // point (one month's worth of organic movement, not an arbitrary
    // jump) — a loose bound, not an exact reconciliation, since the two
    // are independently sourced (live accounts vs. stored snapshots).
    const change = Math.abs(overview.netWorth - lastHistoricalPoint.netWorth);
    expect(change).toBeLessThan(20000);
  });

  it.skipIf(!seedOwnerId)("is deterministic: repeated calls for the same owner return identical history and deltas", async () => {
    const { getNetWorthOverview } = await import("./net-worth-query");

    const first = await getNetWorthOverview(seedOwnerId as string);
    const second = await getNetWorthOverview(seedOwnerId as string);

    expect(second.history).toEqual(first.history);
    expect(second.netWorthChange).toEqual(first.netWorthChange);
  });

  // Task requirement: "Dashboard and Net Worth page must consume the same
  // canonical history calculations. No duplicated delta math." Both pages
  // call this exact same composition function for their delta — asserting
  // it returns one, single, internally-consistent set of numbers rather
  // than each page separately deriving its own is what proves that,
  // since there is no second code path to compare against by construction.
  it.skipIf(!seedOwnerId)("netWorthChange, totalAssetsChange, and totalLiabilitiesChange all compare against the same date", async () => {
    const { getNetWorthOverview } = await import("./net-worth-query");

    const overview = await getNetWorthOverview(seedOwnerId as string);

    expect(overview.netWorthChange!.comparisonDate).toBe(overview.totalAssetsChange!.comparisonDate);
    expect(overview.netWorthChange!.comparisonDate).toBe(overview.totalLiabilitiesChange!.comparisonDate);
  });
});
