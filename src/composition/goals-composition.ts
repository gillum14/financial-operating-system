import "server-only";

import { GoalService } from "@/application/goals/service";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import {
  DrizzleGoalAllocationRepository,
  DrizzleGoalContributionRepository,
  DrizzleGoalRepository,
} from "@/infrastructure/db/goals-repository";

let goalService: GoalService | undefined;

export function getGoalService(): GoalService {
  if (!goalService) {
    goalService = new GoalService(
      new DrizzleGoalRepository(db),
      new DrizzleGoalContributionRepository(db),
      new DrizzleGoalAllocationRepository(db),
      new DrizzleCategoryRepository(db),
      new DrizzleAccountRepository(db),
    );
  }
  return goalService;
}
