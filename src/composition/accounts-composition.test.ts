import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Same rationale as dashboard-composition.test.ts: this intentionally
// connects through the real @/db/client singleton (via @/composition/
// accounts-query), not a swapped-in test client — the bug this file
// guards against (see accounts-query.ts's module comment) is specific to
// that singleton's connection-pool behavior under concurrent queries, so
// faking the connection would defeat the point of the test.
const hasDatabase = isDbTestingAllowed();
const seedOwnerId = process.env.SEED_OWNER_ID;

// A bound well above every observed successful run (~2s) but far below
// what a genuine hang looks like (30s+, often never resolving at all) —
// tight enough that a regression fails fast and clearly as a timeout,
// not a false negative from a merely-slow-but-working query.
const REGRESSION_TIMEOUT_MS = 8000;

describe.skipIf(!hasDatabase || !seedOwnerId)("accounts composition root (integration)", () => {
  it(
    "getAccountsPageData resolves for a seeded owner without hanging",
    async () => {
      const { getAccountsPageData } = await import("./accounts-query");

      const { listView, institutions } = await getAccountsPageData(seedOwnerId as string);

      expect(Array.isArray(listView.rows)).toBe(true);
      expect(Array.isArray(institutions)).toBe(true);
    },
    REGRESSION_TIMEOUT_MS,
  );

  it(
    "getAccountDetailPageData resolves for a real account without hanging",
    async () => {
      const { getAccountsPageData, getAccountDetailPageData } = await import("./accounts-query");

      const { listView } = await getAccountsPageData(seedOwnerId as string);
      expect(listView.rows.length).toBeGreaterThan(0);
      const accountId = listView.rows[0].account.id;

      const { detail, institutions } = await getAccountDetailPageData(seedOwnerId as string, accountId);

      expect(detail).not.toBeNull();
      expect(detail?.account.id).toBe(accountId);
      expect(Array.isArray(institutions)).toBe(true);
    },
    REGRESSION_TIMEOUT_MS,
  );

  it(
    "getAccountDetailPageData resolves for a missing account without hanging",
    async () => {
      const { getAccountDetailPageData } = await import("./accounts-query");

      const { detail, institutions } = await getAccountDetailPageData(
        seedOwnerId as string,
        "00000000-0000-0000-0000-000000000000",
      );

      expect(detail).toBeNull();
      expect(Array.isArray(institutions)).toBe(true);
    },
    REGRESSION_TIMEOUT_MS,
  );

  // The exact realistic navigation sequence that reproduced the original
  // deadlock 100% of the time before this fix: a page that batches
  // several concurrent leaf queries (matching DashboardService's own
  // pattern), immediately followed by repeated accounts-index and
  // accounts-detail calls (including a not-found lookup) on the same
  // long-lived connection. Regresses both the deterministic cause (a
  // LIMIT query run concurrently with siblings) and the pool-size fix.
  it(
    "a realistic multi-page navigation sequence never hangs",
    async () => {
      const { getDashboardSnapshot } = await import("./dashboard-query");
      const { getAccountsPageData, getAccountDetailPageData } = await import("./accounts-query");

      await getDashboardSnapshot(seedOwnerId as string, { recentActivityLimit: 5 });
      const { listView } = await getAccountsPageData(seedOwnerId as string);
      const accountId = listView.rows[0].account.id;
      await getAccountDetailPageData(seedOwnerId as string, accountId);
      await getAccountDetailPageData(seedOwnerId as string, "00000000-0000-0000-0000-000000000000");
      const second = await getAccountsPageData(seedOwnerId as string);

      expect(second.listView.rows.length).toBe(listView.rows.length);
    },
    REGRESSION_TIMEOUT_MS * 2,
  );
});
