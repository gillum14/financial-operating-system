import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

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

  it("computes net worth as the sum of all account balances, including negative liabilities", async () => {
    await accountRepository.create({ ownerId, name: "Checking", accountType: "checking", currentBalance: "500.00" });
    await accountRepository.create({
      ownerId,
      name: "Credit Card",
      accountType: "credit-card",
      currentBalance: "-150.00",
    });

    const data = await service.getDashboardData(ownerId);

    expect(data.netWorth).toBe(350);
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
