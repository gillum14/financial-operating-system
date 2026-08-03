import "server-only";

import type { GoalsOverviewView } from "@/application/goals/goals-views";

export type { GoalsOverviewView };

// Server-only query orchestration for the Goals workspace — same role as
// budgets-query.ts, with no repository behind it yet: there is no Goals
// domain (no schema table, no DrizzleGoalRepository) to query. Kept as a
// real composition function, not inlined in the page, so the Goals page
// already follows the read path (Server Component -> composition -> view
// model) it will use once a real repository exists.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ownerId will scope the real repository query once a Goals domain exists.
export async function getGoalsOverview(ownerId: string): Promise<GoalsOverviewView> {
  return { hasGoals: false };
}
