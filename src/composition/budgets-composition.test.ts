import { describe, expect, it } from "vitest";

import { isDbTestingAllowed } from "@/infrastructure/db/test-support/test-db-client";

// Same rationale as dashboard-composition.test.ts: this intentionally
// connects through the real @/db/client singleton (via @/composition/
// budgets-composition, @/composition/budgets-query), which the sandbox
// seed's own budget fixtures are verified against — see
// docs/development-seed-baseline.md.
const hasDatabase = isDbTestingAllowed();
const seedOwnerId = process.env.SEED_OWNER_ID;

describe.skipIf(!hasDatabase)("budgets composition root (integration)", () => {
  it("wires a singleton BudgetService", async () => {
    const { getBudgetService } = await import("./budgets-composition");
    const { BudgetService } = await import("@/application/budgets/service");

    const first = getBudgetService();
    const second = getBudgetService();

    expect(first).toBeInstanceOf(BudgetService);
    expect(first).toBe(second);
  });

  it.skipIf(!seedOwnerId)("getBudgetsOverview resolves the seeded owner's active period with reconciling totals", async () => {
    const { getBudgetsOverview } = await import("./budgets-query");

    const overview = await getBudgetsOverview(seedOwnerId as string);

    expect(overview.hasBudget).toBe(true);
    expect(overview.period?.status).toBe("active");
    expect(overview.categories!.length).toBeGreaterThan(0);

    // Totals must equal the sum of the category rows returned in the same
    // response — the one and only place both are computed is
    // budget-calculations.ts, so this also guards against the composition
    // layer silently reshaping numbers into an inconsistent state.
    const summedPlanned = overview.categories!.reduce((sum, row) => sum + row.planned, 0);
    const summedActual = overview.categories!.reduce((sum, row) => sum + row.actual, 0);
    expect(overview.metrics!.totalBudgeted).toBeCloseTo(summedPlanned, 6);
    expect(overview.metrics!.totalSpent).toBeCloseTo(summedActual, 6);
    expect(overview.metrics!.totalRemaining).toBeCloseTo(summedPlanned - summedActual, 6);
  });

  it.skipIf(!seedOwnerId)("is deterministic: repeated calls for the same owner/period return identical totals", async () => {
    const { getBudgetsOverview } = await import("./budgets-query");

    const first = await getBudgetsOverview(seedOwnerId as string);
    const second = await getBudgetsOverview(seedOwnerId as string, first.period?.id);

    expect(second.metrics).toEqual(first.metrics);
  });

  it.skipIf(!seedOwnerId)("selecting a historical (Completed) period returns real, read-only data — not an empty state", async () => {
    const { getBudgetsOverview } = await import("./budgets-query");

    const active = await getBudgetsOverview(seedOwnerId as string);
    const completedOption = active.availablePeriods?.find((period) => period.status === "completed");
    expect(completedOption).toBeDefined();

    const historical = await getBudgetsOverview(seedOwnerId as string, completedOption!.id);

    expect(historical.hasBudget).toBe(true);
    expect(historical.period?.status).toBe("completed");
    expect(historical.period?.isEditable).toBe(false);
    expect(historical.categories!.length).toBeGreaterThan(0);
  });
});

// "Both Dashboard widgets must consume the same canonical budget
// calculations as the Budgets page — no duplicate math." Verified
// structurally: both pages' source must import getBudgetsOverview from
// the exact same module, the one place budget totals are computed. This
// is a static source check (same technique as
// src/architecture-boundaries.test.ts / no-infrastructure-imports.test.ts
// in this codebase), not a DB-backed test, so it always runs.
describe("Dashboard and Budgets pages share one budget calculation source", () => {
  it("both import getBudgetsOverview from @/composition/budgets-query", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const dashboardPagePath = path.resolve(
      import.meta.dirname,
      "../app/(authenticated)/dashboard/page.tsx",
    );
    const budgetsPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/budgets/page.tsx");

    const importPattern = /from\s+["']@\/composition\/budgets-query["']/;

    expect(readFileSync(dashboardPagePath, "utf8")).toMatch(importPattern);
    expect(readFileSync(budgetsPagePath, "utf8")).toMatch(importPattern);
  });

  it("neither page imports a second, independent budget-calculation module", async () => {
    const { readFileSync } = await import("node:fs");
    const path = await import("node:path");

    const dashboardPagePath = path.resolve(
      import.meta.dirname,
      "../app/(authenticated)/dashboard/page.tsx",
    );
    const budgetsPagePath = path.resolve(import.meta.dirname, "../app/(authenticated)/budgets/page.tsx");

    // The only other budget-related import either page may have is the
    // shared view-model *type* (application/budgets/budgets-views) or
    // presentation components — never another composition/application
    // module that could compute its own totals.
    const forbiddenPattern = /from\s+["']@\/application\/budgets\/(service|budget-calculations)["']/;

    expect(readFileSync(dashboardPagePath, "utf8")).not.toMatch(forbiddenPattern);
    expect(readFileSync(budgetsPagePath, "utf8")).not.toMatch(forbiddenPattern);
  });
});
