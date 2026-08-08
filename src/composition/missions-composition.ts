import "server-only";

import { MissionService } from "@/application/missions/service";
import { MissionProgressionService } from "@/application/missions/progression-service";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import {
  DrizzleMissionProgressionRepository,
  DrizzleMissionRewardRepository,
  DrizzleMissionXpEventRepository,
} from "@/infrastructure/db/mission-progression-repository";
import { DrizzleMissionRepository } from "@/infrastructure/db/missions-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

import { getBudgetService } from "./budgets-composition";
import { computeCurrentConfidenceScore } from "./confidence-query";
import { getGoalService } from "./goals-composition";

let missionProgressionService: MissionProgressionService | undefined;

export function getMissionProgressionService(): MissionProgressionService {
  if (!missionProgressionService) {
    missionProgressionService = new MissionProgressionService(
      new DrizzleMissionProgressionRepository(db),
      new DrizzleMissionXpEventRepository(db),
      new DrizzleMissionRewardRepository(db),
    );
  }
  return missionProgressionService;
}

let missionService: MissionService | undefined;

export function getMissionService(): MissionService {
  if (!missionService) {
    missionService = new MissionService(
      new DrizzleMissionRepository(db),
      getGoalService(),
      getBudgetService(),
      new DrizzleAccountRepository(db),
      new DrizzleTransactionRepository(db),
      // Injected rather than imported directly inside MissionService —
      // confidence-query.ts is itself a composition module (it wires
      // GoalService/BudgetService/repositories the same way this file
      // does), so calling it from application/missions/service.ts would
      // be a layer inversion. Wiring it here keeps the dependency
      // direction the same as everywhere else: composition depends on
      // application, never the reverse.
      async (ownerId: string) => {
        const result = await computeCurrentConfidenceScore(ownerId);
        return result.overallScore;
      },
      getMissionProgressionService(),
    );
  }
  return missionService;
}
