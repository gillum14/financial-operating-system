import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  FakeBudgetAllocationAdjustmentRepository,
  FakeBudgetAllocationRepository,
  FakeBudgetPeriodRepository,
  FakeCategoryRepository,
  FakeTransactionRepository,
} from "@/application/test-support/repository-fakes";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";

import { BudgetService } from "./service";

describe("BudgetService", () => {
  let periodRepository: FakeBudgetPeriodRepository;
  let allocationRepository: FakeBudgetAllocationRepository;
  let adjustmentRepository: FakeBudgetAllocationAdjustmentRepository;
  let categoryRepository: FakeCategoryRepository;
  let transactionRepository: FakeTransactionRepository;
  let service: BudgetService;
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();

  beforeEach(() => {
    periodRepository = new FakeBudgetPeriodRepository();
    allocationRepository = new FakeBudgetAllocationRepository();
    adjustmentRepository = new FakeBudgetAllocationAdjustmentRepository();
    categoryRepository = new FakeCategoryRepository();
    transactionRepository = new FakeTransactionRepository();
    service = new BudgetService(
      periodRepository,
      allocationRepository,
      adjustmentRepository,
      categoryRepository,
      transactionRepository,
    );
  });

  describe("lifecycle", () => {
    it("creates a period in Draft status", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      expect(period.status).toBe("draft");
    });

    it("rejects a period whose end precedes its start", async () => {
      await expect(
        service.createBudgetPeriod({ ownerId, periodStart: "2026-08-31", periodEnd: "2026-08-01" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("activates a draft period", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      const activated = await service.activateBudgetPeriod(period.id, ownerId);
      expect(activated.status).toBe("active");
    });

    it("rejects activating a period that isn't in draft", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);

      await expect(service.activateBudgetPeriod(period.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects activating a second period while one is already active (one active period per owner)", async () => {
      const first = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(first.id, ownerId);
      const second = await service.createBudgetPeriod({ ownerId, periodStart: "2026-09-01", periodEnd: "2026-09-30" });

      await expect(service.activateBudgetPeriod(second.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("completes an active period", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);

      const completed = await service.completeBudgetPeriod(period.id, ownerId);
      expect(completed.status).toBe("completed");
    });

    it("rejects completing a period that isn't active", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await expect(service.completeBudgetPeriod(period.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("archives a draft, active, or completed period", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      const archived = await service.archiveBudgetPeriod(period.id, ownerId);
      expect(archived.status).toBe("archived");
    });

    it("rejects archiving an already-archived period", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.archiveBudgetPeriod(period.id, ownerId);

      await expect(service.archiveBudgetPeriod(period.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("never hard-deletes — archiving still leaves the period readable", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.archiveBudgetPeriod(period.id, ownerId);

      const stillThere = await service.getBudgetPeriod(period.id, ownerId);
      expect(stillThere).not.toBeNull();
      expect(stillThere?.status).toBe("archived");
    });
  });

  describe("owner isolation and cross-owner denial", () => {
    it("cross-owner budget period id fails closed with NotFoundError", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });

      await expect(service.activateBudgetPeriod(period.id, otherOwnerId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it("cross-owner category reference is rejected when adding an allocation", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const otherOwnersCategory = await categoryRepository.create({ ownerId: otherOwnerId, name: "Groceries" });

      await expect(
        service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: otherOwnersCategory.id, plannedAmount: 100 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("listBudgetPeriods for one owner never includes another owner's periods", async () => {
      await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.createBudgetPeriod({ ownerId: otherOwnerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });

      const periods = await service.listBudgetPeriods(ownerId);
      expect(periods).toHaveLength(1);
      expect(periods[0].ownerId).toBe(ownerId);
    });
  });

  describe("allocations", () => {
    it("adds an allocation and appends display order after existing siblings", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      const dining = await categoryRepository.create({ ownerId, name: "Dining" });

      const first = await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });
      const second = await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: dining.id, plannedAmount: 200 });

      expect(first.displayOrder).toBe(0);
      expect(second.displayOrder).toBe(1);
      expect(first.plannedAmount).toBe("500.00");
    });

    it("rejects a duplicate allocation to the same category within one period", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });

      await expect(
        service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 100 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects a negative planned amount", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });

      await expect(
        service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: -50 }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("accepts a savings/investment-purpose category with no restriction", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const savings = await categoryRepository.create({ ownerId, name: "Savings Contributions" });

      const allocation = await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: savings.id, plannedAmount: 300 });
      expect(allocation.plannedAmount).toBe("300.00");
    });

    it("blocks adding an allocation to a completed period", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      await service.completeBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });

      await expect(
        service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 100 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("updating an allocation's amount logs an adjustment with previous/new amounts", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      const allocation = await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });

      await service.updateAllocationAmount(allocation.id, ownerId, 650);

      const adjustments = await adjustmentRepository.listForOwnerAndAllocations(ownerId, [allocation.id]);
      expect(adjustments).toHaveLength(1);
      expect(adjustments[0].previousAmount).toBe("500.00");
      expect(adjustments[0].newAmount).toBe("650.00");
    });

    it("re-submitting the same amount does not log a spurious adjustment", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      const allocation = await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });

      await service.updateAllocationAmount(allocation.id, ownerId, 500);

      const adjustments = await adjustmentRepository.listForOwnerAndAllocations(ownerId, [allocation.id]);
      expect(adjustments).toHaveLength(0);
    });

    it("removes an allocation (soft delete — it no longer appears in listings)", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      const allocation = await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });

      await service.removeAllocation(allocation.id, ownerId);

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);
      expect(summary?.allocations).toHaveLength(0);
    });

    it("blocks editing allocations on an archived period", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      const allocation = await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });
      await service.archiveBudgetPeriod(period.id, ownerId);

      await expect(service.updateAllocationAmount(allocation.id, ownerId, 600)).rejects.toBeInstanceOf(ConflictError);
      await expect(service.removeAllocation(allocation.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("getBudgetPeriodSummary", () => {
    it("no active budget: returns null for a nonexistent period id", async () => {
      const summary = await service.getBudgetPeriodSummary(ownerId, randomUUID());
      expect(summary).toBeNull();
    });

    it("empty budget: an existing period with zero allocations returns real, all-zero totals — not null", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);

      expect(summary).not.toBeNull();
      expect(summary?.allocations).toEqual([]);
      expect(summary?.totals).toEqual({ totalBudgeted: 0, totalSpent: 0, totalRemaining: 0, overallProgress: 0 });
    });

    it("standard spending reconciles against real Transactions", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });

      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: groceries.id,
        transactionDate: "2026-08-05",
        originalDescription: "GROCERY STORE",
        amount: "-120.00",
        transactionType: "expense",
      });

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);
      expect(summary?.allocations[0].actual).toBe(120);
      expect(summary?.allocations[0].remaining).toBe(380);
    });

    it("partial periods: only transactions inside [periodStart, periodEnd] count", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 500 });

      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: groceries.id,
        transactionDate: "2026-08-04",
        originalDescription: "IN WINDOW",
        amount: "-40.00",
        transactionType: "expense",
      });
      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: groceries.id,
        transactionDate: "2026-07-31",
        originalDescription: "BEFORE WINDOW",
        amount: "-999.00",
        transactionType: "expense",
      });
      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: groceries.id,
        transactionDate: "2026-09-01",
        originalDescription: "AFTER WINDOW",
        amount: "-999.00",
        transactionType: "expense",
      });

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);
      expect(summary?.allocations[0].actual).toBe(40);
    });

    it("historical periods: a completed period's summary still computes live from Transactions, honestly", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-07-01", periodEnd: "2026-07-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const groceries = await categoryRepository.create({ ownerId, name: "Groceries" });
      await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: groceries.id, plannedAmount: 700 });
      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: groceries.id,
        transactionDate: "2026-07-15",
        originalDescription: "GROCERY STORE",
        amount: "-715.79",
        transactionType: "expense",
      });
      await service.completeBudgetPeriod(period.id, ownerId);

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);
      expect(summary?.period.status).toBe("completed");
      expect(summary?.allocations[0].overspending).toBe(true);
    });

    it("transfers never count toward a category's actual spend", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const savings = await categoryRepository.create({ ownerId, name: "Savings" });
      await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: savings.id, plannedAmount: 300 });

      // Transfers carry categoryId: null by this codebase's own
      // convention — included here to prove the summary still reads $0
      // actual for Savings even with transfer activity elsewhere in the
      // period, not because this row could ever match Savings by id.
      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: null,
        transactionDate: "2026-08-10",
        originalDescription: "TRANSFER TO SAVINGS",
        amount: "-300.00",
        transactionType: "transfer",
      });

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);
      expect(summary?.allocations[0].actual).toBe(0);
    });

    it("excluded transactions never count toward a category's actual spend", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const dining = await categoryRepository.create({ ownerId, name: "Dining" });
      await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: dining.id, plannedAmount: 200 });

      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: dining.id,
        transactionDate: "2026-08-10",
        originalDescription: "REIMBURSED CLIENT DINNER",
        amount: "-80.00",
        transactionType: "expense",
        isExcluded: true,
      });

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);
      expect(summary?.allocations[0].actual).toBe(0);
    });

    it("uncategorized transactions never count toward any allocation", async () => {
      const period = await service.createBudgetPeriod({ ownerId, periodStart: "2026-08-01", periodEnd: "2026-08-31" });
      await service.activateBudgetPeriod(period.id, ownerId);
      const dining = await categoryRepository.create({ ownerId, name: "Dining" });
      await service.addAllocation({ ownerId, budgetPeriodId: period.id, categoryId: dining.id, plannedAmount: 200 });

      await transactionRepository.create({
        ownerId,
        accountId: randomUUID(),
        categoryId: null,
        transactionDate: "2026-08-10",
        originalDescription: "POS PURCHASE REF 1234",
        amount: "-25.00",
        transactionType: "expense",
      });

      const summary = await service.getBudgetPeriodSummary(ownerId, period.id);
      expect(summary?.allocations[0].actual).toBe(0);
    });
  });
});
