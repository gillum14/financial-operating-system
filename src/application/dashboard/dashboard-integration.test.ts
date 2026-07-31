import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  FakeAccountRepository,
  FakeCategoryRepository,
  FakeInstitutionRepository,
  FakeTransactionRepository,
} from "@/application/test-support/repository-fakes";

import { toDashboardSnapshot } from "./dashboard-data-adapter";
import { DashboardService } from "./dashboard-service";

// End-to-end test of the real read path — DashboardService -> adapter —
// composed exactly the way src/composition/dashboard-query.ts composes
// them, just against fake repositories instead of a live database. This is
// what "dashboard query composition" and "adapter integration" mean here
// without requiring Postgres; src/composition/dashboard-composition.test.ts
// covers the same wiring against a real database when DATABASE_URL is set.
describe("dashboard read path (service -> adapter)", () => {
  let accountRepository: FakeAccountRepository;
  let institutionRepository: FakeInstitutionRepository;
  let transactionRepository: FakeTransactionRepository;
  let categoryRepository: FakeCategoryRepository;
  let service: DashboardService;
  const ownerId = randomUUID();

  beforeEach(() => {
    accountRepository = new FakeAccountRepository();
    institutionRepository = new FakeInstitutionRepository();
    transactionRepository = new FakeTransactionRepository();
    categoryRepository = new FakeCategoryRepository();
    service = new DashboardService(accountRepository, institutionRepository, transactionRepository, categoryRepository);
  });

  it("produces a presentation-ready snapshot for a populated owner", async () => {
    const institution = await institutionRepository.create({ name: "First National" });
    const checking = await accountRepository.create({
      ownerId,
      institutionId: institution.id,
      name: "Checking",
      accountType: "checking",
      currentBalance: "1500.00",
    });
    await accountRepository.create({
      ownerId,
      name: "Personal Loan",
      accountType: "personal-loan",
      currentBalance: "-4200.00",
    });
    const category = await categoryRepository.create({ ownerId, name: "Groceries" });
    await transactionRepository.create({
      ownerId,
      accountId: checking.id,
      categoryId: category.id,
      transactionDate: "2026-07-05",
      originalDescription: "GROCERY STORE",
      merchant: "Greenfield Market",
      amount: "-85.43",
      transactionType: "expense",
    });
    // No category assigned — exercises the "uncategorized" and
    // "missing optional institution" paths through the whole pipeline.
    await transactionRepository.create({
      ownerId,
      accountId: checking.id,
      transactionDate: "2026-07-06",
      originalDescription: "UNKNOWN VENDOR",
      amount: "-12.00",
      transactionType: "expense",
    });

    const raw = await service.getDashboardData(ownerId);
    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.accounts).toHaveLength(2);
    const loan = snapshot.accounts.find((a) => a.accountType === "personal-loan");
    expect(loan).toMatchObject({ displayGroup: "Loans", displayLabel: "Personal Loan", balance: -4200 });

    expect(snapshot.recentActivity).toHaveLength(2);
    expect(snapshot.recentActivity.map((item) => item.category).sort()).toEqual(["Groceries", "Uncategorized"]);
    expect(snapshot.recentActivity.find((item) => item.merchant === "Greenfield Market")).toBeTruthy();
    expect(snapshot.recentActivity.find((item) => item.merchant === "UNKNOWN VENDOR")).toBeTruthy();

    // Net worth is the sum of current account balances, not a ledger replay
    // of transactions on top of them — matches DashboardService's existing,
    // already-reviewed behavior (src/application/dashboard/dashboard-service.ts).
    expect(snapshot.netWorth.value).toBe(1500 - 4200);
  });

  it("produces a well-shaped, empty snapshot for an owner with no accounts or transactions", async () => {
    const raw = await service.getDashboardData(ownerId);
    const snapshot = toDashboardSnapshot(raw);

    expect(snapshot.accounts).toEqual([]);
    expect(snapshot.recentActivity).toEqual([]);
    expect(snapshot.spendingByCategory).toEqual([]);
    expect(snapshot.spendingTotal).toBe(0);
    expect(snapshot.cashFlowSeries).toEqual([]);
    expect(snapshot.netWorth.value).toBe(0);
    expect(snapshot.monthlyCashFlow.value).toBe(0);
    expect(snapshot.investments.value).toBe(0);
  });
});
