import "server-only";

import { BudgetService } from "@/application/budgets/service";
import { db } from "@/db/client";
import {
  DrizzleBudgetAllocationAdjustmentRepository,
  DrizzleBudgetAllocationRepository,
  DrizzleBudgetPeriodRepository,
} from "@/infrastructure/db/budgets-repository";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

let budgetService: BudgetService | undefined;

export function getBudgetService(): BudgetService {
  if (!budgetService) {
    budgetService = new BudgetService(
      new DrizzleBudgetPeriodRepository(db),
      new DrizzleBudgetAllocationRepository(db),
      new DrizzleBudgetAllocationAdjustmentRepository(db),
      new DrizzleCategoryRepository(db),
      new DrizzleTransactionRepository(db),
    );
  }
  return budgetService;
}
