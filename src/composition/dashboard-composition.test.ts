import { describe, expect, it } from "vitest";

import { DEV_USER_ID } from "@/db/seed/data";

// Requires a real DATABASE_URL — skipped entirely (imports of
// @/composition/dashboard-composition and @/composition/dashboard-query are
// deferred until here, since both transitively import @/db/client, which
// throws at module load without one) when a database isn't configured, same
// pattern as the Slice 7 repository integration tests.
const hasDatabase = Boolean(process.env.DATABASE_URL);

describe.skipIf(!hasDatabase)("dashboard composition root (integration)", () => {
  it("wires a singleton DashboardService", async () => {
    const { getDashboardService } = await import("./dashboard-composition");
    const { DashboardService } = await import("@/application/dashboard/dashboard-service");

    const first = getDashboardService();
    const second = getDashboardService();

    expect(first).toBeInstanceOf(DashboardService);
    expect(first).toBe(second);
  });

  it("getDashboardSnapshot resolves a presentation-ready snapshot for a seeded owner", async () => {
    const { getDashboardSnapshot } = await import("./dashboard-query");

    const snapshot = await getDashboardSnapshot(DEV_USER_ID);

    expect(Array.isArray(snapshot.accounts)).toBe(true);
    expect(Array.isArray(snapshot.recentActivity)).toBe(true);
    expect(Array.isArray(snapshot.spendingByCategory)).toBe(true);
    expect(Array.isArray(snapshot.cashFlowSeries)).toBe(true);
    expect(typeof snapshot.netWorth.value).toBe("number");
  });
});
