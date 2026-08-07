import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import { computeNetWorthBreakdown } from "@/application/net-worth/net-worth-breakdown";
import {
  FakeAccountRepository,
  FakeCategoryRepository,
  FakeInstitutionRepository,
  FakeTransactionRepository,
} from "@/application/test-support/repository-fakes";

import { DashboardService } from "./dashboard-service";

describe("DashboardService", () => {
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

  it("resolves institution names for accounts that have one", async () => {
    const institution = await institutionRepository.create({ name: "First National" });
    await accountRepository.create({
      ownerId,
      institutionId: institution.id,
      name: "Checking",
      accountType: "checking",
      currentBalance: "100.00",
    });
    await accountRepository.create({ ownerId, name: "Cash", accountType: "cash", currentBalance: "20.00" });

    const data = await service.getDashboardData(ownerId);

    const withInstitution = data.accounts.find((entry) => entry.account.name === "Checking");
    const withoutInstitution = data.accounts.find((entry) => entry.account.name === "Cash");
    expect(withInstitution?.institutionName).toBe("First National");
    expect(withoutInstitution?.institutionName).toBeNull();
  });

  it("limits recent transactions to the requested count, most recent first", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
    for (const date of ["2026-07-01", "2026-07-05", "2026-07-10"]) {
      await transactionRepository.create({
        ownerId,
        accountId: account.id,
        transactionDate: date,
        originalDescription: `TXN ${date}`,
        amount: "-10.00",
        transactionType: "expense",
      });
    }

    const data = await service.getDashboardData(ownerId, { recentActivityLimit: 2 });

    expect(data.recentTransactions).toHaveLength(2);
    expect(data.recentTransactions[0].transaction.transactionDate).toBe("2026-07-10");
    expect(data.recentTransactions[1].transaction.transactionDate).toBe("2026-07-05");
  });

  it("resolves each recent transaction's own category name, not the rolled-up parent", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
    const parent = await categoryRepository.create({ ownerId, name: "Food & Dining" });
    const child = await categoryRepository.create({ ownerId, name: "Restaurants", parentCategoryId: parent.id });
    await transactionRepository.create({
      ownerId,
      accountId: account.id,
      categoryId: child.id,
      transactionDate: "2026-07-05",
      originalDescription: "BISTRO",
      amount: "-40.00",
      transactionType: "expense",
    });

    const data = await service.getDashboardData(ownerId);

    expect(data.recentTransactions[0].categoryName).toBe("Restaurants");
  });

  it("rolls up category totals to the parent category for the spending summary", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
    const parent = await categoryRepository.create({ ownerId, name: "Food & Dining" });
    const child = await categoryRepository.create({ ownerId, name: "Restaurants", parentCategoryId: parent.id });
    const today = new Date().toISOString().slice(0, 10);
    await transactionRepository.create({
      ownerId,
      accountId: account.id,
      categoryId: child.id,
      transactionDate: today,
      originalDescription: "BISTRO",
      amount: "-40.00",
      transactionType: "expense",
    });
    await transactionRepository.create({
      ownerId,
      accountId: account.id,
      categoryId: parent.id,
      transactionDate: today,
      originalDescription: "GROCERY",
      amount: "-25.00",
      transactionType: "expense",
    });

    const data = await service.getDashboardData(ownerId);

    expect(data.categoryTotals).toEqual([{ categoryName: "Food & Dining", totalAmount: 65 }]);
  });

  it("excludes transfers from cash-flow and monthly cash-flow totals", async () => {
    const account = await accountRepository.create({ ownerId, name: "Checking", accountType: "checking" });
    const today = new Date().toISOString().slice(0, 10);
    await transactionRepository.create({
      ownerId,
      accountId: account.id,
      transactionDate: today,
      originalDescription: "PAYCHECK",
      amount: "1000.00",
      transactionType: "income",
    });
    await transactionRepository.create({
      ownerId,
      accountId: account.id,
      transactionDate: today,
      originalDescription: "SAVINGS TRANSFER",
      amount: "-200.00",
      transactionType: "transfer",
    });

    const data = await service.getDashboardData(ownerId);

    expect(data.monthlyCashFlow).toBe(1000);
    expect(data.cashFlowByDate).toEqual([{ date: today, income: 1000, expenses: 0 }]);
  });

  // Regression coverage for the DashboardService Net Worth canonicalization
  // refactor: this must never again be a second, independently-maintained
  // signed-sum — it must be computeNetWorthBreakdown, byte-for-byte.
  describe("Net Worth canonicalization", () => {
    it("computes net worth, total assets, and total liabilities via the exact same function the Net Worth page uses", async () => {
      const checking = await accountRepository.create({
        ownerId,
        name: "Checking",
        accountType: "checking",
        currentBalance: "500.00",
      });
      const creditCard = await accountRepository.create({
        ownerId,
        name: "Credit Card",
        accountType: "credit-card",
        currentBalance: "-150.00",
      });

      const data = await service.getDashboardData(ownerId);
      const expected = computeNetWorthBreakdown([checking, creditCard]);

      expect(data.netWorth).toBe(expected.netWorth);
      expect(data.totalAssets).toBe(expected.totalAssets);
      expect(data.totalLiabilities).toBe(expected.totalLiabilities);
      expect(data.netWorth).toBe(350);
      expect(data.totalAssets).toBe(500);
      expect(data.totalLiabilities).toBe(150);
    });

    it("classifies liabilities by account presentation group, not by raw sign — a liability's negative balance becomes a positive totalLiabilities magnitude", async () => {
      await accountRepository.create({ ownerId, name: "Mortgage", accountType: "mortgage", currentBalance: "-300000.00" });
      await accountRepository.create({ ownerId, name: "Auto Loan", accountType: "vehicle-loan", currentBalance: "-12000.00" });

      const data = await service.getDashboardData(ownerId);

      expect(data.totalLiabilities).toBe(312000);
      expect(data.totalAssets).toBe(0);
      expect(data.netWorth).toBe(-312000);
    });

    it("excludes archived accounts from net worth, total assets, and total liabilities — same active-only population getNetWorthOverview uses", async () => {
      const active = await accountRepository.create({
        ownerId,
        name: "Active Checking",
        accountType: "checking",
        currentBalance: "1000.00",
      });
      const toArchive = await accountRepository.create({
        ownerId,
        name: "Old Savings",
        accountType: "savings",
        currentBalance: "5000.00",
      });
      await accountRepository.archive(toArchive.id, ownerId);

      const data = await service.getDashboardData(ownerId);

      expect(data.netWorth).toBe(1000);
      expect(data.totalAssets).toBe(1000);
      // The archived account still appears in the accounts list itself
      // (accountsWithInstitutions, used by the Accounts Overview widget —
      // unrelated to Net Worth math and deliberately left unfiltered).
      expect(data.accounts.map((entry) => entry.account.name)).toContain("Old Savings");
      expect(active.status).toBe("active");
    });

    it("returns zero net worth, total assets, and total liabilities when the owner has no accounts", async () => {
      const data = await service.getDashboardData(ownerId);

      expect(data.netWorth).toBe(0);
      expect(data.totalAssets).toBe(0);
      expect(data.totalLiabilities).toBe(0);
    });

    it("handles a mixed asset/liability portfolio consistently with computeNetWorthBreakdown", async () => {
      const accountsCreated = await Promise.all([
        accountRepository.create({ ownerId, name: "Checking", accountType: "checking", currentBalance: "4200.00" }),
        accountRepository.create({ ownerId, name: "Brokerage", accountType: "investment", currentBalance: "18000.00" }),
        accountRepository.create({ ownerId, name: "Credit Card", accountType: "credit-card", currentBalance: "-980.00" }),
        accountRepository.create({ ownerId, name: "Mortgage", accountType: "mortgage", currentBalance: "-250000.00" }),
      ]);

      const data = await service.getDashboardData(ownerId);
      const expected = computeNetWorthBreakdown(accountsCreated);

      expect(data.netWorth).toBe(expected.netWorth);
      expect(data.totalAssets).toBe(expected.totalAssets);
      expect(data.totalLiabilities).toBe(expected.totalLiabilities);
    });
  });

  it("computes investments total from only investment and retirement accounts", async () => {
    await accountRepository.create({ ownerId, name: "Checking", accountType: "checking", currentBalance: "500.00" });
    await accountRepository.create({
      ownerId,
      name: "Brokerage",
      accountType: "investment",
      currentBalance: "10000.00",
    });
    await accountRepository.create({ ownerId, name: "401k", accountType: "retirement", currentBalance: "25000.00" });

    const data = await service.getDashboardData(ownerId);

    expect(data.investmentsTotal).toBe(35000);
  });
});
