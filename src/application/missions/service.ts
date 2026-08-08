import { z } from "zod";

import type { BudgetPeriodTotals } from "@/application/budgets/budget-calculations";
import type { BudgetService } from "@/application/budgets/service";
import type { GoalProgress } from "@/application/goals/goal-calculations";
import type { GoalService } from "@/application/goals/service";
import type { Account } from "@/domains/accounts/types";
import type { AccountRepository } from "@/domains/accounts/repository";
import type { BudgetPeriodStatus } from "@/domains/budgets/types";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";
import { MISSION_TYPES } from "@/db/schema/missions";
import type { MissionRepository } from "@/domains/missions/repository";
import type { Mission, MissionType } from "@/domains/missions/types";
import type { TransactionRepository } from "@/domains/transactions/repository";

import {
  computeCategorizeTransactionsProgress,
  computeCustomMissionProgress,
  computeGoalMissionProgress,
  computeReduceDebtProgress,
  computeStayWithinBudgetProgress,
  computeImproveConfidenceProgress,
  type MissionProgress,
} from "./mission-calculations";
import { computeEligibleMissionCandidates, type MissionCandidate } from "./mission-eligibility";
import { computeMissionXpValue } from "./progression-calculations";
import type { MissionProgressionService } from "./progression-service";

const startMissionSchema = z.object({
  ownerId: z.string().uuid(),
  missionType: z.enum(MISSION_TYPES),
  relatedGoalId: z.string().uuid().optional(),
  relatedAccountId: z.string().uuid().optional(),
  relatedBudgetPeriodId: z.string().uuid().optional(),
  // Whether this start was initiated from the Daily Mission spotlight —
  // locked onto the row at creation (missions.is_daily_mission), the same
  // as everything else start-time captures; determines the one-time +25
  // XP bonus at completion (progression-calculations.ts's
  // DAILY_MISSION_BONUS_XP).
  isDailyMission: z.boolean().optional(),
});

const createCustomMissionSchema = z.object({
  ownerId: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().min(1, "Description is required").max(500),
});

export interface MissionWithProgress {
  mission: Mission;
  progress: MissionProgress;
}

// The only class that touches the missions table directly. It never
// recomputes Goal, Budget, Account, Transaction, or Confidence math itself
// — GoalService and BudgetService are injected and called the same way
// confidence-query.ts already calls them; AccountRepository/
// TransactionRepository are read directly (plain reads, same as
// confidence-query.ts's own Accounts/Transactions usage); getConfidenceScore
// is injected as a plain function rather than importing confidence-query.ts
// directly, since that module lives in the composition layer and this
// service must not depend "up" into composition (the composition root
// wires this callback to confidence-query.ts's computeCurrentConfidenceScore
// — see missions-composition.ts).
export class MissionService {
  constructor(
    private readonly missionRepository: MissionRepository,
    private readonly goalService: GoalService,
    private readonly budgetService: BudgetService,
    private readonly accountRepository: AccountRepository,
    private readonly transactionRepository: TransactionRepository,
    private readonly getConfidenceScore: (ownerId: string) => Promise<number | null>,
    // Injected the same way GoalService/BudgetService are — a plain
    // sibling application-layer class, not a composition-layer import.
    // Every completion transition below calls into this exactly once; see
    // MissionProgressionService's own module comment for why it can never
    // touch Confidence.
    private readonly progressionService: MissionProgressionService,
  ) {}

  // ---- Eligibility (never persisted) ------------------------------------

  async listCandidates(ownerId: string): Promise<MissionCandidate[]> {
    const [goalProgressList, activeBudgetPeriod, uncategorizedTransactions, activeAccounts, confidenceOverallScore, existingMissions] =
      await Promise.all([
        this.goalService.listGoalsWithProgress(ownerId),
        this.budgetService.getActiveBudgetPeriod(ownerId),
        this.transactionRepository.listForOwner(ownerId, { uncategorizedOnly: true }),
        this.accountRepository.listForOwner(ownerId, "active"),
        this.getConfidenceScore(ownerId),
        this.missionRepository.listForOwner(ownerId),
      ]);

    const activeBudgetPeriodInput = activeBudgetPeriod
      ? await this.toBudgetPeriodInput(ownerId, activeBudgetPeriod.id, activeBudgetPeriod.status)
      : null;

    return computeEligibleMissionCandidates({
      goalProgressList,
      activeBudgetPeriod: activeBudgetPeriodInput,
      uncategorizedTransactionIds: uncategorizedTransactions.map((transaction) => transaction.id),
      liabilityAccounts: activeAccounts,
      confidenceOverallScore,
      existingMissions,
    });
  }

  // ---- Lifecycle ----------------------------------------------------

  // Re-validates eligibility server-side against fresh data before writing
  // anything — a candidate list the caller may be holding (e.g. from a
  // page render a few seconds earlier) is never trusted as still valid.
  // This is also where the immutable start-time snapshot (startValue/
  // targetValue/relatedTransactionIds/title/description) is captured.
  async startMission(input: {
    ownerId: string;
    missionType: MissionType;
    relatedGoalId?: string;
    relatedAccountId?: string;
    relatedBudgetPeriodId?: string;
    isDailyMission?: boolean;
  }): Promise<Mission> {
    const parsed = startMissionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const candidates = await this.listCandidates(parsed.data.ownerId);
    const candidate = candidates.find((c) => this.candidateMatches(c, parsed.data));
    if (!candidate) {
      throw new ConflictError("This mission is no longer available to start.");
    }

    const { difficulty, xpValue } = computeMissionXpValue(candidate.missionType);

    return this.missionRepository.create({
      ownerId: parsed.data.ownerId,
      missionType: candidate.missionType,
      title: candidate.title,
      description: candidate.description,
      difficulty,
      xpValue,
      isDailyMission: parsed.data.isDailyMission ?? false,
      relatedGoalId: candidate.relatedGoalId ?? null,
      relatedAccountId: candidate.relatedAccountId ?? null,
      relatedBudgetPeriodId: candidate.relatedBudgetPeriodId ?? null,
      relatedTransactionIds: candidate.relatedTransactionIds ?? null,
      startValue: this.startValueFor(candidate),
      targetValue: this.targetValueFor(candidate),
      targetBandId: candidate.targetBandId ?? null,
    });
  }

  // User-authored mission — never eligibility-detected, never
  // auto-completed. Created directly as Active (there is no "candidate"
  // stage for a mission the user is defining themselves). No related
  // entity, no startValue/targetValue/targetBandId: those all exist to
  // support deterministic evaluation against real data, which a custom
  // mission by definition has none of.
  async createCustomMission(input: { ownerId: string; title: string; description: string }): Promise<Mission> {
    const parsed = createCustomMissionSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    const { difficulty, xpValue } = computeMissionXpValue("custom");

    return this.missionRepository.create({
      ownerId: parsed.data.ownerId,
      missionType: "custom",
      title: parsed.data.title,
      description: parsed.data.description,
      difficulty,
      xpValue,
      isDailyMission: false,
      relatedGoalId: null,
      relatedAccountId: null,
      relatedBudgetPeriodId: null,
      relatedTransactionIds: null,
      startValue: null,
      targetValue: null,
      targetBandId: null,
    });
  }

  // The one manual completion path in the whole system — "User Confirmed"
  // verification (missions-specification.md §7): Athena cannot verify a
  // custom mission's completion itself, so the user does. Restricted to
  // missionType "custom" specifically: a system mission type's completion
  // must never be manually forced, only ever discovered by
  // listMissionsWithProgress's real-data evaluation — allowing that here
  // would let a user "complete" e.g. a reduce-debt mission without
  // actually paying anything down.
  async completeCustomMission(id: string, ownerId: string): Promise<Mission> {
    const mission = await this.requireOwnedMission(id, ownerId);
    if (mission.missionType !== "custom") {
      throw new ConflictError(`Mission ${id} is not a custom mission and cannot be manually completed`);
    }
    if (mission.status !== "active") {
      throw new ConflictError(`Mission ${id} must be active to complete (current: ${mission.status})`);
    }
    const completed = await this.missionRepository.updateStatus(id, ownerId, { status: "completed", completedAt: new Date() });
    await this.progressionService.recordMissionCompletion(completed);
    return completed;
  }

  // Active or Completed -> Archived. Never deletes the row — no DELETE
  // grant exists at any layer. completedAt is left exactly as it is: an
  // already-completed mission's completion record is permanent (mirrors
  // GoalService.archiveGoal).
  async archiveMission(id: string, ownerId: string): Promise<Mission> {
    const mission = await this.requireOwnedMission(id, ownerId);
    if (mission.status === "archived") {
      throw new ConflictError(`Mission ${id} is already archived`);
    }
    return this.missionRepository.updateStatus(id, ownerId, { status: "archived", completedAt: mission.completedAt });
  }

  // ---- Progress + auto-completion -------------------------------------

  // Every non-archived mission's progress is deterministic and recomputed
  // live on every call — nothing here is cached or stored. Any Active
  // mission whose freshly-computed progress is complete is transitioned to
  // Completed right here, with a real completedAt timestamp, before being
  // returned — there is no background job or scheduler in this codebase,
  // so "evaluate on read" is how completion is ever discovered at all.
  // Once transitioned, a later call can never un-complete it (missions-
  // model.md §18: completion is permanent even if the underlying financial
  // state later reverses).
  async listMissionsWithProgress(ownerId: string): Promise<MissionWithProgress[]> {
    const missions = await this.missionRepository.listForOwner(ownerId);
    if (missions.length === 0) return [];

    const [goalProgressList, accounts, uncategorizedTransactions, confidenceOverallScore] = await Promise.all([
      this.goalService.listGoalsWithProgress(ownerId),
      this.accountRepository.listForOwner(ownerId),
      this.transactionRepository.listForOwner(ownerId, { uncategorizedOnly: true }),
      confidenceScoreNeeded(missions) ? this.getConfidenceScore(ownerId) : Promise.resolve(null),
    ]);

    const goalProgressById = new Map(goalProgressList.map((progress) => [progress.goal.id, progress]));
    const accountById = new Map(accounts.map((account) => [account.id, account]));
    const uncategorizedIds = new Set(uncategorizedTransactions.map((transaction) => transaction.id));

    const budgetPeriodIds = [...new Set(missions.map((m) => m.relatedBudgetPeriodId).filter((id): id is string => id !== null))];
    const budgetInputById = new Map(
      await Promise.all(
        budgetPeriodIds.map(async (periodId) => {
          const input = await this.toBudgetPeriodInput(ownerId, periodId, null);
          return [periodId, input] as const;
        }),
      ),
    );

    const results: MissionWithProgress[] = [];
    for (const mission of missions) {
      const progress = this.computeProgressFor(mission, {
        goalProgressById,
        accountById,
        uncategorizedIds,
        budgetInputById,
        confidenceOverallScore,
      });

      let current = mission;
      if (mission.status === "active" && progress.isComplete) {
        current = await this.missionRepository.updateStatus(mission.id, ownerId, {
          status: "completed",
          completedAt: new Date(),
        });
        await this.progressionService.recordMissionCompletion(current);
      }

      results.push({ mission: current, progress });
    }

    return results;
  }

  async getMissionWithProgress(id: string, ownerId: string): Promise<MissionWithProgress | null> {
    const all = await this.listMissionsWithProgress(ownerId);
    return all.find((entry) => entry.mission.id === id) ?? null;
  }

  // ---- Private helpers -----------------------------------------------

  private candidateMatches(
    candidate: MissionCandidate,
    requested: { missionType: MissionType; relatedGoalId?: string; relatedAccountId?: string; relatedBudgetPeriodId?: string },
  ): boolean {
    if (candidate.missionType !== requested.missionType) return false;
    switch (candidate.missionType) {
      case "fund-emergency-fund":
      case "reach-savings-goal":
        return candidate.relatedGoalId === requested.relatedGoalId;
      case "reduce-debt":
        return candidate.relatedAccountId === requested.relatedAccountId;
      case "stay-within-budget":
        return candidate.relatedBudgetPeriodId === requested.relatedBudgetPeriodId;
      case "categorize-transactions":
      case "improve-confidence":
        return true;
      case "custom":
        // Unreachable in practice — computeEligibleMissionCandidates never
        // produces a "custom" candidate (see mission-eligibility.ts) — but
        // needed for exhaustiveness over MissionType.
        return false;
    }
  }

  private startValueFor(candidate: MissionCandidate): string | null {
    switch (candidate.missionType) {
      case "reduce-debt":
      case "improve-confidence":
      case "categorize-transactions":
        return candidate.preview.currentValue.toFixed(4);
      default:
        return null;
    }
  }

  private targetValueFor(candidate: MissionCandidate): string | null {
    switch (candidate.missionType) {
      case "stay-within-budget":
        return "100.0000";
      case "reduce-debt":
      case "improve-confidence":
      case "categorize-transactions":
        return candidate.preview.targetValue.toFixed(4);
      default:
        return null;
    }
  }

  private computeProgressFor(
    mission: Mission,
    context: {
      goalProgressById: Map<string, GoalProgress>;
      accountById: Map<string, Account>;
      uncategorizedIds: Set<string>;
      budgetInputById: Map<string, { status: BudgetPeriodStatus; totals: BudgetPeriodTotals } | null>;
      confidenceOverallScore: number | null;
    },
  ): MissionProgress {
    switch (mission.missionType) {
      case "fund-emergency-fund":
      case "reach-savings-goal": {
        const progress = mission.relatedGoalId ? context.goalProgressById.get(mission.relatedGoalId) : undefined;
        if (!progress) {
          return { currentValue: 0, targetValue: 0, percentComplete: 0, isComplete: false, explanation: "The linked goal is no longer available." };
        }
        return computeGoalMissionProgress(progress);
      }
      case "reduce-debt": {
        const account = mission.relatedAccountId ? context.accountById.get(mission.relatedAccountId) : undefined;
        const startBalance = Number(mission.startValue ?? 0);
        if (!account || account.currentBalance === null) {
          return { currentValue: startBalance, targetValue: 0, percentComplete: 0, isComplete: false, explanation: "The linked account is no longer available." };
        }
        return computeReduceDebtProgress(startBalance, Number(account.currentBalance));
      }
      case "categorize-transactions":
        return computeCategorizeTransactionsProgress(mission.relatedTransactionIds ?? [], context.uncategorizedIds);
      case "stay-within-budget": {
        const budgetInput = mission.relatedBudgetPeriodId ? context.budgetInputById.get(mission.relatedBudgetPeriodId) : undefined;
        if (!budgetInput) {
          return { currentValue: 0, targetValue: 100, percentComplete: 0, isComplete: false, explanation: "The linked budget period is no longer available." };
        }
        return computeStayWithinBudgetProgress(budgetInput.status, budgetInput.totals);
      }
      case "improve-confidence": {
        const startValue = Number(mission.startValue ?? 0);
        const targetValue = Number(mission.targetValue ?? 0);
        const targetBandLabel = mission.targetBandId ?? "next";
        return computeImproveConfidenceProgress(startValue, targetValue, targetBandLabel, context.confidenceOverallScore);
      }
      case "custom":
        // Never inferred from status "active" -> isComplete: false here by
        // construction (see computeCustomMissionProgress) — this mission
        // type can only ever leave Active through completeCustomMission,
        // never through this evaluate-on-read path.
        return computeCustomMissionProgress(mission.status);
    }
  }

  private async toBudgetPeriodInput(
    ownerId: string,
    budgetPeriodId: string,
    knownStatus: BudgetPeriodStatus | null,
  ): Promise<{ id: string; status: BudgetPeriodStatus; periodLabel: string; totals: BudgetPeriodTotals } | null> {
    const summary = await this.budgetService.getBudgetPeriodSummary(ownerId, budgetPeriodId);
    if (!summary) return null;
    return {
      id: budgetPeriodId,
      status: knownStatus ?? summary.period.status,
      periodLabel: formatPeriodLabel(summary.period.periodStart),
      totals: summary.totals,
    };
  }

  private async requireOwnedMission(id: string, ownerId: string): Promise<Mission> {
    const mission = await this.missionRepository.getByIdForOwner(id, ownerId);
    if (!mission) {
      throw new NotFoundError(`Mission ${id} not found for owner ${ownerId}`);
    }
    return mission;
  }
}

function confidenceScoreNeeded(missions: Mission[]): boolean {
  return missions.some((mission) => mission.missionType === "improve-confidence");
}

function formatPeriodLabel(periodStart: string): string {
  return new Date(`${periodStart}T00:00:00Z`).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
}
