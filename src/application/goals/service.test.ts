import { randomUUID } from "node:crypto";

import { beforeEach, describe, expect, it } from "vitest";

import {
  FakeAccountRepository,
  FakeCategoryRepository,
  FakeGoalAllocationRepository,
  FakeGoalContributionRepository,
  FakeGoalRepository,
} from "@/application/test-support/repository-fakes";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";

import { GoalService } from "./service";

describe("GoalService", () => {
  let goalRepository: FakeGoalRepository;
  let contributionRepository: FakeGoalContributionRepository;
  let allocationRepository: FakeGoalAllocationRepository;
  let categoryRepository: FakeCategoryRepository;
  let accountRepository: FakeAccountRepository;
  let service: GoalService;
  const ownerId = randomUUID();
  const otherOwnerId = randomUUID();

  beforeEach(() => {
    goalRepository = new FakeGoalRepository();
    contributionRepository = new FakeGoalContributionRepository();
    allocationRepository = new FakeGoalAllocationRepository();
    categoryRepository = new FakeCategoryRepository();
    accountRepository = new FakeAccountRepository();
    service = new GoalService(goalRepository, contributionRepository, allocationRepository, categoryRepository, accountRepository);
  });

  describe("createGoal", () => {
    it("creates an active goal with the given target amount", async () => {
      const goal = await service.createGoal({
        ownerId,
        title: "Emergency Fund",
        targetAmount: 5000,
        goalType: "emergency-fund",
      });

      expect(goal.status).toBe("active");
      expect(goal.targetAmount).toBe("5000.00");
    });

    it("rejects a non-positive target amount", async () => {
      await expect(
        service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 0, goalType: "emergency-fund" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects a target date in the past", async () => {
      await expect(
        service.createGoal({
          ownerId,
          title: "Emergency Fund",
          targetAmount: 5000,
          targetDate: "2000-01-01",
          goalType: "emergency-fund",
        }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects a categoryId owned by someone else", async () => {
      const othersCategory = await categoryRepository.create({ ownerId: otherOwnerId, name: "Savings" });
      await expect(
        service.createGoal({
          ownerId,
          title: "Emergency Fund",
          targetAmount: 5000,
          goalType: "emergency-fund",
          categoryId: othersCategory.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects an accountId owned by someone else", async () => {
      const othersAccount = await accountRepository.create({ ownerId: otherOwnerId, name: "Savings", accountType: "savings" });
      await expect(
        service.createGoal({
          ownerId,
          title: "Emergency Fund",
          targetAmount: 5000,
          goalType: "emergency-fund",
          accountId: othersAccount.id,
        }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("appends display order after existing siblings", async () => {
      const first = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const second = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 3000, goalType: "vacation" });

      expect(first.displayOrder).toBe(0);
      expect(second.displayOrder).toBe(1);
    });
  });

  describe("updateGoal", () => {
    it("edits an active goal's fields", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const updated = await service.updateGoal(goal.id, ownerId, { title: "Rainy Day Fund", targetAmount: 6000 });

      expect(updated.title).toBe("Rainy Day Fund");
      expect(updated.targetAmount).toBe("6000.00");
    });

    it("blocks editing an archived goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      await service.archiveGoal(goal.id, ownerId);

      await expect(service.updateGoal(goal.id, ownerId, { title: "New Title" })).rejects.toBeInstanceOf(ConflictError);
    });

    it("cross-owner goal id fails closed with NotFoundError", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      await expect(service.updateGoal(goal.id, otherOwnerId, { title: "Hijacked" })).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("completeGoal", () => {
    it("completes an active goal once its target is met", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 1000, contributionDate: "2026-08-01" });

      const completed = await service.completeGoal(goal.id, ownerId);

      expect(completed.status).toBe("completed");
      expect(completed.completedAt).not.toBeNull();
    });

    it("rejects completing a goal that hasn't reached its target yet", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 500, contributionDate: "2026-08-01" });

      await expect(service.completeGoal(goal.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects completing a goal that isn't active", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 1000, contributionDate: "2026-08-01" });
      await service.completeGoal(goal.id, ownerId);

      await expect(service.completeGoal(goal.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });
  });

  describe("archiveGoal", () => {
    it("archives an active goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const archived = await service.archiveGoal(goal.id, ownerId);
      expect(archived.status).toBe("archived");
    });

    it("never hard-deletes — archiving still leaves the goal readable", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.archiveGoal(goal.id, ownerId);

      const stillThere = await service.getGoal(goal.id, ownerId);
      expect(stillThere).not.toBeNull();
      expect(stillThere?.status).toBe("archived");
    });

    it("rejects archiving an already-archived goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.archiveGoal(goal.id, ownerId);

      await expect(service.archiveGoal(goal.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("archives a paused goal directly, without requiring it to resume first", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.pauseGoal(goal.id, ownerId);

      const archived = await service.archiveGoal(goal.id, ownerId);
      expect(archived.status).toBe("archived");
    });
  });

  describe("pauseGoal / resumeGoal", () => {
    it("pauses an active goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const paused = await service.pauseGoal(goal.id, ownerId);
      expect(paused.status).toBe("paused");
    });

    it("resumes a paused goal back to active", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.pauseGoal(goal.id, ownerId);

      const resumed = await service.resumeGoal(goal.id, ownerId);
      expect(resumed.status).toBe("active");
    });

    it("preserves all existing contributions and allocations across a pause/resume cycle", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 300, contributionDate: "2026-08-01" });

      await service.pauseGoal(goal.id, ownerId);
      const pausedProgress = await service.getGoalProgress(goal.id, ownerId);
      expect(pausedProgress?.currentAmount).toBe(300);

      await service.resumeGoal(goal.id, ownerId);
      const resumedProgress = await service.getGoalProgress(goal.id, ownerId);
      expect(resumedProgress?.currentAmount).toBe(300);
    });

    it("rejects pausing a goal that isn't active (already paused)", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.pauseGoal(goal.id, ownerId);

      await expect(service.pauseGoal(goal.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects pausing a completed goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 1000, contributionDate: "2026-08-01" });
      await service.completeGoal(goal.id, ownerId);

      await expect(service.pauseGoal(goal.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("rejects resuming a goal that isn't paused", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await expect(service.resumeGoal(goal.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("a paused goal cannot be completed directly — it must resume first", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 1000, contributionDate: "2026-08-01" });
      await service.pauseGoal(goal.id, ownerId);

      await expect(service.completeGoal(goal.id, ownerId)).rejects.toBeInstanceOf(ConflictError);
    });

    it("a paused goal is still editable (title, target amount, priority)", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.pauseGoal(goal.id, ownerId);

      const updated = await service.updateGoal(goal.id, ownerId, { title: "Renamed While Paused", priority: "high" });
      expect(updated.title).toBe("Renamed While Paused");
      expect(updated.priority).toBe("high");
    });

    it("cross-owner goal id fails closed with NotFoundError on pauseGoal/resumeGoal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await expect(service.pauseGoal(goal.id, otherOwnerId)).rejects.toBeInstanceOf(NotFoundError);

      await service.pauseGoal(goal.id, ownerId);
      await expect(service.resumeGoal(goal.id, otherOwnerId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("priority", () => {
    it("defaults a new goal's priority to medium", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      expect(goal.priority).toBe("medium");
    });

    it("accepts an explicit priority at creation", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation", priority: "high" });
      expect(goal.priority).toBe("high");
    });

    it("priority persists across a read", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation", priority: "low" });
      const fetched = await service.getGoal(goal.id, ownerId);
      expect(fetched?.priority).toBe("low");
    });

    it("priority is editable independent of other fields", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const updated = await service.updateGoal(goal.id, ownerId, { priority: "high" });

      expect(updated.priority).toBe("high");
      expect(updated.title).toBe("Vacation Fund");
    });
  });

  describe("contributions", () => {
    it("adding a contribution never mutates a stored balance — currentAmount is always derived", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 250, contributionDate: "2026-08-01" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-05" });

      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.currentAmount).toBe(350);
    });

    it("contributions are always recorded with source 'manual', never client-supplied", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const contribution = await service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-01" });
      expect(contribution.source).toBe("manual");
    });

    it("rejects a non-positive contribution amount", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await expect(
        service.addContribution({ ownerId, goalId: goal.id, amount: -50, contributionDate: "2026-08-01" }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("blocks adding a contribution to an archived goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.archiveGoal(goal.id, ownerId);

      await expect(
        service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-01" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("blocks adding a contribution to a paused goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.pauseGoal(goal.id, ownerId);

      await expect(
        service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-01" }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("allows adding a contribution to a completed goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 1000, contributionDate: "2026-08-01" });
      await service.completeGoal(goal.id, ownerId);

      const contribution = await service.addContribution({ ownerId, goalId: goal.id, amount: 50, contributionDate: "2026-08-10" });
      expect(contribution.amount).toBe("50.00");
    });

    it("edits an existing contribution's amount", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const contribution = await service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-01" });

      const updated = await service.updateContribution(contribution.id, ownerId, { amount: 175 });
      expect(updated.amount).toBe("175.00");

      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.currentAmount).toBe(175);
    });

    it("removing a contribution is a soft delete — it no longer counts toward currentAmount", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const contribution = await service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-01" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 50, contributionDate: "2026-08-05" });

      await service.removeContribution(contribution.id, ownerId);

      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.currentAmount).toBe(50);
    });

    it("cross-owner contribution id fails closed with NotFoundError on edit and remove", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const contribution = await service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-01" });

      await expect(service.updateContribution(contribution.id, otherOwnerId, { amount: 999 })).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.removeContribution(contribution.id, otherOwnerId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("owner isolation", () => {
    it("listGoals for one owner never includes another owner's goals", async () => {
      await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      await service.createGoal({ ownerId: otherOwnerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });

      const goals = await service.listGoals(ownerId);
      expect(goals).toHaveLength(1);
      expect(goals[0].ownerId).toBe(ownerId);
    });

    it("cross-owner goal id fails closed with NotFoundError on completeGoal/archiveGoal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await expect(service.completeGoal(goal.id, otherOwnerId)).rejects.toBeInstanceOf(NotFoundError);
      await expect(service.archiveGoal(goal.id, otherOwnerId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("listGoalsWithProgress / dashboard consistency", () => {
    it("computes progress for every owned goal in one batch, matching per-goal getGoalProgress", async () => {
      const emergencyFund = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 2000, goalType: "emergency-fund" });
      const vacation = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: emergencyFund.id, amount: 500, contributionDate: "2026-08-01" });
      await service.addContribution({ ownerId, goalId: vacation.id, amount: 250, contributionDate: "2026-08-02" });

      const all = await service.listGoalsWithProgress(ownerId);
      const single = await service.getGoalProgress(emergencyFund.id, ownerId);

      expect(all).toHaveLength(2);
      const batchedEmergencyFund = all.find((progress) => progress.goal.id === emergencyFund.id);
      expect(batchedEmergencyFund?.currentAmount).toBe(single?.currentAmount);
    });

    it("no goals: returns an empty array, not null or an error", async () => {
      const all = await service.listGoalsWithProgress(ownerId);
      expect(all).toEqual([]);
    });
  });

  describe("listRecentContributions", () => {
    it("returns contributions across every goal, newest first, capped to the given limit", async () => {
      const goal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 100, contributionDate: "2026-08-01" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 200, contributionDate: "2026-08-10" });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 300, contributionDate: "2026-08-05" });

      const recent = await service.listRecentContributions(ownerId, 2);

      expect(recent).toHaveLength(2);
      expect(recent[0].contributionDate).toBe("2026-08-10");
    });
  });

  // ---- Goal Allocations (ADR-0003) --------------------------------------

  describe("allocateFunds", () => {
    async function makeAccount(overrides: { accountType?: string; currentBalance?: string | null; status?: "active" | "archived"; ownerId?: string } = {}) {
      return accountRepository.create({
        ownerId: overrides.ownerId ?? ownerId,
        name: "Savings",
        accountType: (overrides.accountType ?? "savings") as never,
        status: overrides.status ?? "active",
        currentBalance: overrides.currentBalance === undefined ? "10000.00" : overrides.currentBalance,
      });
    }

    it("one account -> one goal: allocates and shows up as allocatedAmount", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount();

      const allocation = await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 2000 });

      expect(allocation.amount).toBe("2000.00");
      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.allocatedAmount).toBe(2000);
      expect(progress?.currentAmount).toBe(2000);
    });

    it("one account -> multiple goals: the same account funds two goals, each tracked independently", async () => {
      const goalA = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const goalB = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 2000, goalType: "vacation" });
      const account = await makeAccount({ currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goalA.id, accountId: account.id, amount: 4000 });
      await service.allocateFunds({ ownerId, goalId: goalB.id, accountId: account.id, amount: 1500 });

      const progressA = await service.getGoalProgress(goalA.id, ownerId);
      const progressB = await service.getGoalProgress(goalB.id, ownerId);
      expect(progressA?.allocatedAmount).toBe(4000);
      expect(progressB?.allocatedAmount).toBe(1500);
    });

    it("one goal -> multiple accounts: a goal draws from two different accounts", async () => {
      const goal = await service.createGoal({ ownerId, title: "House Down Payment", targetAmount: 20000, goalType: "home" });
      const accountA = await makeAccount({ currentBalance: "10000.00" });
      const accountB = await makeAccount({ currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goal.id, accountId: accountA.id, amount: 6000 });
      await service.allocateFunds({ ownerId, goalId: goal.id, accountId: accountB.id, amount: 4000 });

      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.allocatedAmount).toBe(10000);

      const sources = await service.listAllocationsForGoal(goal.id, ownerId);
      expect(sources).toHaveLength(2);
    });

    it("partial allocation: only part of an account's balance is claimed, the rest stays free", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount({ currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 2000 });

      const remaining = await allocationRepository.listForOwnerAndAccounts(ownerId, [account.id]);
      const allocated = remaining.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
      expect(allocated).toBe(2000);
      expect(10000 - allocated).toBe(8000);
    });

    it("exact full allocation: allocating exactly the available balance succeeds", async () => {
      const goal = await service.createGoal({ ownerId, title: "College Fund", targetAmount: 8000, goalType: "education" });
      const account = await makeAccount({ accountType: "other-asset", currentBalance: "8000.00" });

      const allocation = await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 8000 });
      expect(allocation.amount).toBe("8000.00");
    });

    it("attempted over-allocation: rejects an amount exceeding the account's unallocated balance", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount({ currentBalance: "1000.00" });

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 1500 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("attempted over-allocation across two goals sharing one account: the second allocation that would tip it over is rejected", async () => {
      const goalA = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const goalB = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 5000, goalType: "vacation" });
      const account = await makeAccount({ currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goalA.id, accountId: account.id, amount: 7000 });

      await expect(
        service.allocateFunds({ ownerId, goalId: goalB.id, accountId: account.id, amount: 4000 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("CD funding: an other-asset (CD) account can fund a goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "College Fund", targetAmount: 8000, goalType: "education" });
      const cd = await makeAccount({ accountType: "other-asset", currentBalance: "10184.22" });

      const allocation = await service.allocateFunds({ ownerId, goalId: goal.id, accountId: cd.id, amount: 8000 });
      expect(allocation.amount).toBe("8000.00");
    });

    it("rejects an ineligible account type (e.g. a credit card, a liability)", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const creditCard = await makeAccount({ accountType: "credit-card", currentBalance: "-500.00" });

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: creditCard.id, amount: 100 }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("rejects an account with no balance set", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount({ currentBalance: null });

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 100 }),
      ).rejects.toBeInstanceOf(ValidationError);
    });

    it("archived goals cannot receive new allocations", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      await service.archiveGoal(goal.id, ownerId);
      const account = await makeAccount();

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 100 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("paused goals cannot receive new allocations", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      await service.pauseGoal(goal.id, ownerId);
      const account = await makeAccount();

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 100 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("archived accounts cannot fund a goal", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount({ status: "archived" });

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 100 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    it("cross-owner account reference fails closed with NotFoundError", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const othersAccount = await makeAccount({ ownerId: otherOwnerId });

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: othersAccount.id, amount: 100 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("cross-owner goal reference fails closed with NotFoundError", async () => {
      const othersGoal = await service.createGoal({ ownerId: otherOwnerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount();

      await expect(
        service.allocateFunds({ ownerId, goalId: othersGoal.id, accountId: account.id, amount: 100 }),
      ).rejects.toBeInstanceOf(NotFoundError);
    });

    it("rejects a duplicate allocation to the same account for the same goal (edit the existing one instead)", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount({ currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 1000 });

      await expect(
        service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 500 }),
      ).rejects.toBeInstanceOf(ConflictError);
    });

    // "Manual contribution + allocation non-double-counting"
    it("mixed funding: allocated and manual amounts sum without double counting", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await makeAccount({ currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 2000 });
      await service.addContribution({ ownerId, goalId: goal.id, amount: 500, contributionDate: "2026-08-01" });

      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.allocatedAmount).toBe(2000);
      expect(progress?.manualContributionsAmount).toBe(500);
      expect(progress?.currentAmount).toBe(2500);
    });

    // "Overfunded goals" via allocation
    it("allocating past the target amount overfunds the goal, honestly reflected in percentComplete", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 1000, goalType: "emergency-fund" });
      const account = await makeAccount({ currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 1500 });

      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.percentComplete).toBe(150);
      expect(progress?.remainingAmount).toBe(-500);
    });
  });

  describe("editAllocation", () => {
    async function makeFundedGoalAndAllocation(balance: string, amount: number) {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await accountRepository.create({
        ownerId,
        name: "Savings",
        accountType: "savings",
        currentBalance: balance,
      });
      const allocation = await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount });
      return { goal, account, allocation };
    }

    it("increases an allocation within the account's remaining unallocated balance", async () => {
      const { allocation } = await makeFundedGoalAndAllocation("10000.00", 2000);
      const updated = await service.editAllocation(allocation.id, ownerId, 3000);
      expect(updated.amount).toBe("3000.00");
    });

    it("rejects increasing an allocation past the account's available balance", async () => {
      const { allocation } = await makeFundedGoalAndAllocation("2000.00", 2000);
      await expect(service.editAllocation(allocation.id, ownerId, 2500)).rejects.toBeInstanceOf(ConflictError);
    });

    it("re-saving the same amount never collides with itself", async () => {
      const { allocation } = await makeFundedGoalAndAllocation("2000.00", 2000);
      const updated = await service.editAllocation(allocation.id, ownerId, 2000);
      expect(updated.amount).toBe("2000.00");
    });

    it("cross-owner allocation id fails closed with NotFoundError", async () => {
      const { allocation } = await makeFundedGoalAndAllocation("10000.00", 2000);
      await expect(service.editAllocation(allocation.id, otherOwnerId, 3000)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("removeAllocation", () => {
    it("removing an allocation is a soft delete — it frees up the account's unallocated balance", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await accountRepository.create({ ownerId, name: "Savings", accountType: "savings", currentBalance: "3000.00" });
      const allocation = await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 3000 });

      await service.removeAllocation(allocation.id, ownerId);

      const progress = await service.getGoalProgress(goal.id, ownerId);
      expect(progress?.allocatedAmount).toBe(0);

      // The account's full balance is available again for a new allocation.
      const secondGoal = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 1000, goalType: "vacation" });
      const secondAllocation = await service.allocateFunds({ ownerId, goalId: secondGoal.id, accountId: account.id, amount: 3000 });
      expect(secondAllocation.amount).toBe("3000.00");
    });

    it("cross-owner allocation id fails closed with NotFoundError", async () => {
      const goal = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const account = await accountRepository.create({ ownerId, name: "Savings", accountType: "savings", currentBalance: "3000.00" });
      const allocation = await service.allocateFunds({ ownerId, goalId: goal.id, accountId: account.id, amount: 1000 });

      await expect(service.removeAllocation(allocation.id, otherOwnerId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe("unallocated balance / listAllAllocations", () => {
    it("computes the correct unallocated balance for an account funding multiple goals", async () => {
      const goalA = await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const goalB = await service.createGoal({ ownerId, title: "Vacation Fund", targetAmount: 5000, goalType: "vacation" });
      const account = await accountRepository.create({ ownerId, name: "Savings", accountType: "savings", currentBalance: "10000.00" });

      await service.allocateFunds({ ownerId, goalId: goalA.id, accountId: account.id, amount: 3000 });
      await service.allocateFunds({ ownerId, goalId: goalB.id, accountId: account.id, amount: 2000 });

      const all = await service.listAllAllocations(ownerId);
      const totalAllocated = all.reduce((sum, allocation) => sum + Number(allocation.amount), 0);
      expect(totalAllocated).toBe(5000);
      expect(Number(account.currentBalance) - totalAllocated).toBe(5000);
    });

    it("no allocations: listAllAllocations returns an empty array, not null or an error", async () => {
      await service.createGoal({ ownerId, title: "Emergency Fund", targetAmount: 5000, goalType: "emergency-fund" });
      const all = await service.listAllAllocations(ownerId);
      expect(all).toEqual([]);
    });
  });
});
