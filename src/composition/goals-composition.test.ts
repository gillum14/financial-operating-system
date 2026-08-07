import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Same rationale as budgets-composition.test.ts: this intentionally
// connects through the real @/db/client singleton (via @/composition/
// goals-composition, @/composition/goals-query), which the sandbox seed's
// own goal fixtures are verified against.
const hasDatabase = isDbTestingAllowed();
const seedOwnerId = process.env.SEED_OWNER_ID;

describe.skipIf(!hasDatabase)("goals composition root (integration)", () => {
  it("wires a singleton GoalService", async () => {
    const { getGoalService } = await import("./goals-composition");
    const { GoalService } = await import("@/application/goals/service");

    const first = getGoalService();
    const second = getGoalService();

    expect(first).toBeInstanceOf(GoalService);
    expect(first).toBe(second);
  });

  it.skipIf(!seedOwnerId)("getGoalsOverview resolves the seeded owner's goals with reconciling totals", async () => {
    const { getGoalsOverview } = await import("./goals-query");

    const overview = await getGoalsOverview(seedOwnerId as string);

    expect(overview.hasGoals).toBe(true);
    expect(overview.goals!.length).toBeGreaterThan(0);

    // Metrics must equal what's derivable from the same goal rows returned
    // in the response — the one and only place both are computed is
    // GoalService/goal-calculations.ts, so this also guards against the
    // composition layer silently reshaping numbers into an inconsistent
    // state.
    const countedGoals = overview.goals!.filter((goal) => goal.status !== "archived");
    const summedSaved = countedGoals.reduce((sum, goal) => sum + goal.currentAmount, 0);
    expect(overview.metrics!.totalGoals).toBe(countedGoals.length);
    expect(overview.metrics!.totalSaved).toBeCloseTo(summedSaved, 6);
  });

  it.skipIf(!seedOwnerId)("is deterministic: repeated calls for the same owner return identical totals", async () => {
    const { getGoalsOverview } = await import("./goals-query");

    const first = await getGoalsOverview(seedOwnerId as string);
    const second = await getGoalsOverview(seedOwnerId as string);

    expect(second.metrics).toEqual(first.metrics);
  });

  it.skipIf(!seedOwnerId)("the seeded sandbox includes a completed goal, a nearly-complete goal, a new goal, and a behind goal", async () => {
    const { getGoalsOverview } = await import("./goals-query");

    const overview = await getGoalsOverview(seedOwnerId as string);
    const healths = overview.goals!.map((goal) => goal.health);

    expect(healths).toContain("completed");
    expect(healths).toContain("behind");
    // "Nearly complete" and "new" are percent-based facts, not health
    // labels — verified directly against percentCompleteDisplay instead.
    expect(overview.goals!.some((goal) => goal.percentCompleteDisplay >= 85 && goal.status === "active")).toBe(true);
    expect(overview.goals!.some((goal) => goal.percentCompleteDisplay <= 15 && goal.status === "active")).toBe(true);
  });

  it.skipIf(!seedOwnerId)("the seeded sandbox includes a paused goal that counts toward totals but never toward On Track", async () => {
    const { getGoalsOverview } = await import("./goals-query");

    const overview = await getGoalsOverview(seedOwnerId as string);
    const pausedGoal = overview.goals!.find((goal) => goal.status === "paused");
    expect(pausedGoal).toBeDefined();

    // Counted in Total Goals/Total Saved (only Archived is excluded from
    // totals) — recomputed independently from the same goal rows the
    // response returned, not hardcoded, so this stays honest if the
    // sandbox's non-archived goal count ever changes.
    const countedGoals = overview.goals!.filter((goal) => goal.status !== "archived");
    expect(overview.metrics!.totalGoals).toBe(countedGoals.length);

    // Never counted toward On Track — that metric only ever considers
    // status === "active" goals (see goals-query.ts), so a paused goal's
    // health/progress can never contribute to it regardless of how the
    // pace math would otherwise classify it.
    const expectedOnTrack = overview.goals!.filter(
      (goal) => goal.status === "active" && (goal.health === "excellent" || goal.health === "on-track"),
    ).length;
    expect(overview.metrics!.onTrackCount).toBe(expectedOnTrack);
  });

  it.skipIf(!seedOwnerId)("upcomingObjectives never includes a paused, completed, or archived goal", async () => {
    const { getGoalsOverview } = await import("./goals-query");

    const overview = await getGoalsOverview(seedOwnerId as string);
    const activeGoalIds = new Set(overview.goals!.filter((goal) => goal.status === "active").map((goal) => goal.id));

    expect(overview.upcomingObjectives!.length).toBeGreaterThan(0);
    for (const objective of overview.upcomingObjectives!) {
      expect(activeGoalIds.has(objective.goalId)).toBe(true);
    }
  });
});

// "Dashboard must consume the same canonical Goal composition. No
// duplicated calculations." Verified structurally: the Dashboard page's
// source must import getGoalsOverview from the exact same module the
// Goals page itself uses, the one place goal totals are computed. Same
// technique as the equivalent Budgets check in budgets-composition.test.ts.
describe("Dashboard and Goals pages share one goal calculation source", () => {
  it("both import getGoalsOverview from @/composition/goals-query", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const dashboardPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/dashboard/page.tsx");
    const goalsPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/goals/page.tsx");

    const importPattern = /from\s+["']@\/composition\/goals-query["']/;

    expect(readFileSync(dashboardPagePath, "utf8")).toMatch(importPattern);
    expect(readFileSync(goalsPagePath, "utf8")).toMatch(importPattern);
  });

  it("neither page imports a second, independent goal-calculation module", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const dashboardPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/dashboard/page.tsx");
    const goalsPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/goals/page.tsx");

    const forbiddenPattern = /from\s+["']@\/application\/goals\/(service|goal-calculations)["']/;

    expect(readFileSync(dashboardPagePath, "utf8")).not.toMatch(forbiddenPattern);
    expect(readFileSync(goalsPagePath, "utf8")).not.toMatch(forbiddenPattern);
  });
});
