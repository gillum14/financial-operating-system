import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Same rationale as goals-composition.test.ts/budgets-composition.test.ts:
// this intentionally connects through the real @/db/client singleton (via
// @/composition/missions-composition, @/composition/missions-query),
// which the real sandbox seed data (goals, budget, transactions, accounts,
// confidence) is verified against — Missions never gets its own fixture
// data; it's entirely derived from what those other domains already seed.
const hasDatabase = isDbTestingAllowed();
const seedOwnerId = process.env.SEED_OWNER_ID;

describe.skipIf(!hasDatabase)("missions composition root (integration)", () => {
  it("wires a singleton MissionService", async () => {
    const { getMissionService } = await import("./missions-composition");
    const { MissionService } = await import("@/application/missions/service");

    const first = getMissionService();
    const second = getMissionService();

    expect(first).toBeInstanceOf(MissionService);
    expect(first).toBe(second);
  });

  it.skipIf(!seedOwnerId)("getMissionsOverview resolves real candidates from the seeded sandbox's real data", async () => {
    const { getMissionsOverview } = await import("./missions-query");

    const overview = await getMissionsOverview(seedOwnerId as string);

    // The sandbox seeds active goals, an active budget period, liability
    // accounts, and transaction history — at least one real, deterministic
    // candidate must fall out of that, with zero fabrication.
    expect(overview.candidates.length).toBeGreaterThan(0);

    // topCandidates is always a same-order prefix of candidates, capped at
    // 3 — never a separate ranking, never more than the shortened list the
    // main page is supposed to show.
    expect(overview.topCandidates.length).toBeLessThanOrEqual(3);
    expect(overview.topCandidates).toEqual(overview.candidates.slice(0, overview.topCandidates.length));

    // impactSummary always reflects the real completed-missions count —
    // zero here (the seed owner has never started a Mission Engine
    // mission), never a fabricated nonzero placeholder.
    expect(overview.impactSummary.completedCount).toBe(overview.completed.length);
  });

  it.skipIf(!seedOwnerId)(
    "every candidate's related entity resolves against the same owner's real Goals/Budgets data",
    async () => {
      const { getMissionsOverview } = await import("./missions-query");
      const { getGoalsOverview } = await import("./goals-query");
      const { getBudgetsOverview } = await import("./budgets-query");

      const [missionsOverview, goalsOverview, budgetsOverview] = await Promise.all([
        getMissionsOverview(seedOwnerId as string),
        getGoalsOverview(seedOwnerId as string),
        getBudgetsOverview(seedOwnerId as string),
      ]);

      const realGoalIds = new Set((goalsOverview.goals ?? []).map((goal) => goal.id));
      const realBudgetPeriodId = budgetsOverview.period?.id;

      for (const candidate of missionsOverview.candidates) {
        if (candidate.relatedGoalId) {
          expect(realGoalIds.has(candidate.relatedGoalId)).toBe(true);
        }
        if (candidate.relatedBudgetPeriodId) {
          expect(candidate.relatedBudgetPeriodId).toBe(realBudgetPeriodId);
        }
      }
    },
    15000,
  );

  it.skipIf(!seedOwnerId)(
    "is deterministic: repeated calls return the same candidate set",
    async () => {
      const { getMissionsOverview } = await import("./missions-query");

      const first = await getMissionsOverview(seedOwnerId as string);
      const second = await getMissionsOverview(seedOwnerId as string);

      expect(second.candidates.map((c) => c.missionType).sort()).toEqual(first.candidates.map((c) => c.missionType).sort());
      expect(second.active).toEqual(first.active);
      expect(second.completed).toEqual(first.completed);
    },
    15000,
  );

  it.skipIf(!seedOwnerId)("never proposes a candidate for an entity that already has a non-archived mission", async () => {
    const { getMissionService } = await import("./missions-composition");

    const missionService = getMissionService();
    const [candidates, missionsWithProgress] = await Promise.all([
      missionService.listCandidates(seedOwnerId as string),
      missionService.listMissionsWithProgress(seedOwnerId as string),
    ]);

    const takenGoalIds = new Set(
      missionsWithProgress
        .filter(({ mission }) => mission.status !== "archived" && mission.relatedGoalId)
        .map(({ mission }) => mission.relatedGoalId),
    );

    for (const candidate of candidates) {
      if (candidate.relatedGoalId) {
        expect(takenGoalIds.has(candidate.relatedGoalId)).toBe(false);
      }
    }
  });
});

// "Dashboard must consume the same canonical Mission composition. No
// duplicated calculations." Verified structurally, same technique as the
// equivalent Goals/Budgets checks in goals-composition.test.ts/
// budgets-composition.test.ts.
describe("Dashboard and Missions pages share one mission calculation source", () => {
  it("both import getMissionsOverview from @/composition/missions-query", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const dashboardPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/dashboard/page.tsx");
    const missionsPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/missions/page.tsx");

    const importPattern = /from\s+["']@\/composition\/missions-query["']/;

    expect(readFileSync(dashboardPagePath, "utf8")).toMatch(importPattern);
    expect(readFileSync(missionsPagePath, "utf8")).toMatch(importPattern);
  });

  it("neither page imports a second, independent mission-calculation module", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const dashboardPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/dashboard/page.tsx");
    const missionsPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/missions/page.tsx");

    const forbiddenPattern = /from\s+["']@\/application\/missions\/(service|mission-calculations|mission-eligibility)["']/;

    expect(readFileSync(dashboardPagePath, "utf8")).not.toMatch(forbiddenPattern);
    expect(readFileSync(missionsPagePath, "utf8")).not.toMatch(forbiddenPattern);
  });
});

// Confidence remains authoritative and the Confidence Engine/Mission
// Engine stay separate systems — structurally verified: Mission Engine
// code never imports the Confidence Engine's own calculation module, only
// its read-only composition output (the same way it never imports Goal/
// Budget calculation modules directly — see goals-composition.test.ts's
// equivalent check).
describe("Mission Engine never duplicates Confidence/Goal/Budget calculation logic", () => {
  it("mission-calculations.ts and mission-eligibility.ts import calculation types only, never the confidence-calculations compute function", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const files = [
      path.resolve(import.meta.dirname, "../application/missions/mission-calculations.ts"),
      path.resolve(import.meta.dirname, "../application/missions/mission-eligibility.ts"),
      path.resolve(import.meta.dirname, "../application/missions/service.ts"),
    ];

    for (const file of files) {
      const content = readFileSync(file, "utf8");
      expect(content).not.toMatch(/computeConfidenceScore/);
    }
  });

  it("MissionService is injected with GoalService/BudgetService, never a second copy of their repositories doing its own math", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const servicePath = path.resolve(import.meta.dirname, "../application/missions/service.ts");
    const content = readFileSync(servicePath, "utf8");

    expect(content).toMatch(/goalService: GoalService/);
    expect(content).toMatch(/budgetService: BudgetService/);
  });
});
