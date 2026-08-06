import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// The one DB-gated test file that intentionally still connects via
// DATABASE_URL (the app's own pooled connection), not TEST_DATABASE_URL —
// it exercises the real composition root (@/composition/dashboard-
// composition, @/composition/dashboard-query), which transitively imports
// the @/db/client singleton itself. There's no swappable connection to
// substitute without faking the composition root, which would defeat the
// point of the test. It is read-only (wires a singleton, reads a
// snapshot) — no write risk — but still gated behind the same
// ALLOW_DB_TESTS + TEST_DATABASE_URL requirement as every other DB-backed
// test (see db-test-guard.ts) so it never runs implicitly just because
// DATABASE_URL happens to be set.
const hasDatabase = isDbTestingAllowed();
// The snapshot test additionally needs a real, already-seeded Supabase Auth
// user id (see src/db/seed/data.ts / README) — there is no fictional
// fallback anymore now that public.users.id has a foreign key to
// auth.users.id.
const seedOwnerId = process.env.SEED_OWNER_ID;

describe.skipIf(!hasDatabase)("dashboard composition root (integration)", () => {
  it("wires a singleton DashboardService", async () => {
    const { getDashboardService } = await import("./dashboard-composition");
    const { DashboardService } = await import("@/application/dashboard/dashboard-service");

    const first = getDashboardService();
    const second = getDashboardService();

    expect(first).toBeInstanceOf(DashboardService);
    expect(first).toBe(second);
  });

  it.skipIf(!seedOwnerId)("getDashboardSnapshot resolves a presentation-ready snapshot for a seeded owner", async () => {
    const { getDashboardSnapshot } = await import("./dashboard-query");

    const snapshot = await getDashboardSnapshot(seedOwnerId as string);

    expect(Array.isArray(snapshot.accounts)).toBe(true);
    expect(Array.isArray(snapshot.recentActivity)).toBe(true);
    expect(Array.isArray(snapshot.spendingByCategory)).toBe(true);
    expect(Array.isArray(snapshot.cashFlowSeries)).toBe(true);
    expect(typeof snapshot.netWorth.value).toBe("number");
  });
});
