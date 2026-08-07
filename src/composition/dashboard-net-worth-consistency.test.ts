import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Regression coverage for the Net Worth canonicalization refactor: proves,
// against the real seeded sandbox, that Dashboard and the Net Worth page
// can no longer silently disagree. Both getDashboardService().
// getDashboardData() and getNetWorthOverview() independently fetch the
// owner's accounts and independently call computeNetWorthBreakdown — this
// asserts the two round trips still produce byte-identical numbers, which
// only holds if both go through the same canonical calculation on the
// same active-only account population.
const hasDatabase = isDbTestingAllowed();
const seedOwnerId = process.env.SEED_OWNER_ID;

describe.skipIf(!hasDatabase)("Dashboard / Net Worth canonical consistency (integration)", () => {
  it.skipIf(!seedOwnerId)("DashboardService and getNetWorthOverview agree on net worth, total assets, and total liabilities", async () => {
    const { getDashboardService } = await import("./dashboard-composition");
    const { getNetWorthOverview } = await import("./net-worth-query");

    const dashboardData = await getDashboardService().getDashboardData(seedOwnerId as string);
    const netWorthOverview = await getNetWorthOverview(seedOwnerId as string);

    expect(dashboardData.netWorth).toBe(netWorthOverview.netWorth);
    expect(dashboardData.totalAssets).toBe(netWorthOverview.totalAssets);
    expect(dashboardData.totalLiabilities).toBe(netWorthOverview.totalLiabilities);
  });

  it.skipIf(!seedOwnerId)("the presentation layer's rendered value (getDashboardSnapshot) matches getNetWorthOverview too", async () => {
    const { getDashboardSnapshot } = await import("./dashboard-query");
    const { getNetWorthOverview } = await import("./net-worth-query");

    const snapshot = await getDashboardSnapshot(seedOwnerId as string);
    const netWorthOverview = await getNetWorthOverview(seedOwnerId as string);

    // snapshot.netWorth.value is DashboardService's own canonical
    // computation (post-adapter); the Dashboard page itself renders from
    // netWorthOverview.netWorth directly (see app/(authenticated)/
    // dashboard/page.tsx) — both must agree since both now derive from
    // computeNetWorthBreakdown over the same active-only accounts.
    expect(snapshot.netWorth.value).toBe(netWorthOverview.netWorth);
  });

  it.skipIf(!seedOwnerId)("is deterministic: repeated calls agree with each other, not just once by coincidence", async () => {
    const { getDashboardService } = await import("./dashboard-composition");
    const { getNetWorthOverview } = await import("./net-worth-query");

    const first = await getDashboardService().getDashboardData(seedOwnerId as string);
    const second = await getNetWorthOverview(seedOwnerId as string);
    const third = await getDashboardService().getDashboardData(seedOwnerId as string);
    const fourth = await getNetWorthOverview(seedOwnerId as string);

    expect(first.netWorth).toBe(second.netWorth);
    expect(third.netWorth).toBe(fourth.netWorth);
    expect(first.netWorth).toBe(third.netWorth);
  });
});
