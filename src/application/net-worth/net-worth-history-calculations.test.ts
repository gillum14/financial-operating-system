import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Account, AccountType } from "@/domains/accounts/types";
import type { AccountBalanceSnapshot } from "@/domains/net-worth-history/types";

import type { NetWorthCategoryItem } from "./net-worth-breakdown";
import {
  computeAccountBalanceChanges,
  computeCategoryChanges,
  computeChange,
  computeNetWorthHistory,
  lastDayOfPreviousMonth,
  selectComparisonPoint,
  toDateOnlyString,
} from "./net-worth-history-calculations";

function makeSnapshot(overrides: Partial<AccountBalanceSnapshot> = {}): AccountBalanceSnapshot {
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    accountId: randomUUID(),
    snapshotDate: "2026-01-31",
    balance: "1000.00",
    accountType: "checking",
    balanceSource: "manual",
    snapshotType: "monthly",
    createdAt: new Date(),
    ...overrides,
  };
}

function makeAccount(overrides: Partial<Account> = {}): Account {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    institutionId: null,
    name: "Test Account",
    accountType: "checking",
    maskedAccountNumber: null,
    currency: "USD",
    status: "active",
    balanceSource: "manual",
    currentBalance: "1000.00",
    openingDate: null,
    closingDate: null,
    notes: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("computeNetWorthHistory", () => {
  it("groups snapshots by date and computes a breakdown per date, sorted oldest first", () => {
    const accountId = randomUUID();
    const snapshots = [
      makeSnapshot({ accountId, snapshotDate: "2026-02-28", balance: "1200.00" }),
      makeSnapshot({ accountId, snapshotDate: "2026-01-31", balance: "1000.00" }),
    ];

    const history = computeNetWorthHistory(snapshots);

    expect(history).toEqual([
      { snapshotDate: "2026-01-31", netWorth: 1000, totalAssets: 1000, totalLiabilities: 0 },
      { snapshotDate: "2026-02-28", netWorth: 1200, totalAssets: 1200, totalLiabilities: 0 },
    ]);
  });

  it("combines multiple accounts' rows sharing the same date into one point", () => {
    const snapshots = [
      makeSnapshot({ snapshotDate: "2026-01-31", balance: "1000.00", accountType: "checking" }),
      makeSnapshot({ snapshotDate: "2026-01-31", balance: "-200.00", accountType: "credit-card" }),
    ];

    const history = computeNetWorthHistory(snapshots);

    expect(history).toEqual([{ snapshotDate: "2026-01-31", netWorth: 800, totalAssets: 1000, totalLiabilities: 200 }]);
  });

  it("returns an empty array for no snapshots", () => {
    expect(computeNetWorthHistory([])).toEqual([]);
  });
});

describe("selectComparisonPoint", () => {
  it("returns the most recent (last, since history is ascending) point", () => {
    const history = [
      { snapshotDate: "2026-01-31", netWorth: 100, totalAssets: 100, totalLiabilities: 0 },
      { snapshotDate: "2026-02-28", netWorth: 200, totalAssets: 200, totalLiabilities: 0 },
    ];

    expect(selectComparisonPoint(history)?.snapshotDate).toBe("2026-02-28");
  });

  it("returns null when there is no history yet", () => {
    expect(selectComparisonPoint([])).toBeNull();
  });
});

describe("computeChange", () => {
  it("computes absolute and percent change", () => {
    const change = computeChange(1200, 1000, "2026-01-31");
    expect(change).toEqual({ comparisonDate: "2026-01-31", absoluteChange: 200, percentChange: 20 });
  });

  it("computes a negative change", () => {
    const change = computeChange(800, 1000, "2026-01-31");
    expect(change.absoluteChange).toBe(-200);
    expect(change.percentChange).toBe(-20);
  });

  it("returns null percentChange when the comparison value is zero, not 0 or Infinity", () => {
    const change = computeChange(500, 0, "2026-01-31");
    expect(change.absoluteChange).toBe(500);
    expect(change.percentChange).toBeNull();
  });

  it("returns zero change for identical values", () => {
    const change = computeChange(1000, 1000, "2026-01-31");
    expect(change.absoluteChange).toBe(0);
    expect(change.percentChange).toBe(0);
  });
});

describe("computeAccountBalanceChanges", () => {
  it("pairs each account with its comparison snapshot by accountId", () => {
    const account = makeAccount({ id: "acct-1", name: "Checking", currentBalance: "1200.00" });
    const comparisonSnapshots = [makeSnapshot({ accountId: "acct-1", balance: "1000.00" })];

    const changes = computeAccountBalanceChanges([account], comparisonSnapshots);

    expect(changes).toEqual([
      {
        accountId: "acct-1",
        accountName: "Checking",
        accountType: "checking",
        currentBalance: 1200,
        comparisonBalance: 1000,
        absoluteChange: 200,
      },
    ]);
  });

  it("omits an account with no row in the comparison snapshots (opened after the comparison date)", () => {
    const account = makeAccount({ id: "acct-new", currentBalance: "500.00" });

    const changes = computeAccountBalanceChanges([account], []);

    expect(changes).toEqual([]);
  });

  it("sorts by absolute change magnitude, largest first", () => {
    const small = makeAccount({ id: "small", currentBalance: "110.00" });
    const large = makeAccount({ id: "large", currentBalance: "2000.00" });
    const comparisonSnapshots = [
      makeSnapshot({ accountId: "small", balance: "100.00" }),
      makeSnapshot({ accountId: "large", balance: "1000.00" }),
    ];

    const changes = computeAccountBalanceChanges([small, large], comparisonSnapshots);

    expect(changes.map((c) => c.accountId)).toEqual(["large", "small"]);
  });
});

describe("computeCategoryChanges", () => {
  function makeCategoryItem(accountType: AccountType, amount: number): NetWorthCategoryItem {
    return { accountType, label: accountType, amount, percent: 100 };
  }

  it("computes the change for a category present in both current and comparison", () => {
    const current = [makeCategoryItem("savings", 1200)];
    const comparison = [makeCategoryItem("savings", 1000)];

    expect(computeCategoryChanges(current, comparison)).toEqual([
      { accountType: "savings", currentAmount: 1200, comparisonAmount: 1000, absoluteChange: 200 },
    ]);
  });

  it("treats a category absent from the comparison set as a zero prior amount", () => {
    const current = [makeCategoryItem("investment", 500)];

    expect(computeCategoryChanges(current, [])).toEqual([
      { accountType: "investment", currentAmount: 500, comparisonAmount: 0, absoluteChange: 500 },
    ]);
  });
});

describe("toDateOnlyString", () => {
  it("formats a Date as YYYY-MM-DD in UTC", () => {
    expect(toDateOnlyString(new Date("2026-03-15T18:30:00Z"))).toBe("2026-03-15");
  });
});

describe("lastDayOfPreviousMonth", () => {
  it("returns the last day of the month before asOf's month", () => {
    expect(lastDayOfPreviousMonth(new Date("2026-08-04T12:00:00Z"))).toBe("2026-07-31");
  });

  it("rolls back across a year boundary", () => {
    expect(lastDayOfPreviousMonth(new Date("2026-01-15T00:00:00Z"))).toBe("2025-12-31");
  });

  it("handles a leap-year February correctly", () => {
    expect(lastDayOfPreviousMonth(new Date("2028-03-01T00:00:00Z"))).toBe("2028-02-29");
  });
});
