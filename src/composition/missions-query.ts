import "server-only";

import type { MissionsOverviewView } from "@/application/missions/missions-views";

export type { MissionsOverviewView };

// Server-only query orchestration for the Missions workspace — same role
// as goals-query.ts/budgets-query.ts, with no repository behind it yet:
// there is no Missions domain (no schema table, no
// DrizzleMissionRepository) to query. Kept as a real composition
// function, not inlined in the page, so the Missions page already follows
// the read path (Server Component -> composition -> view model) it will
// use once a real repository exists.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ownerId will scope the real repository query once a Missions domain exists.
export async function getMissionsOverview(ownerId: string): Promise<MissionsOverviewView> {
  return { hasMissions: false };
}
