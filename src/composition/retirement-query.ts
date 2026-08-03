import "server-only";

import type { RetirementOverviewView } from "@/application/retirement/retirement-views";

export type { RetirementOverviewView };

// Server-only query orchestration for the Retirement workspace — same
// role as goals-query.ts/missions-query.ts/investments-query.ts, with no
// repository behind it yet: there is no Retirement domain (no schema
// table, no DrizzleRetirementRepository) to query. Kept as a real
// composition function, not inlined in the page, so the Retirement page
// already follows the read path (Server Component -> composition -> view
// model) it will use once a real repository exists.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ownerId will scope the real repository query once a Retirement domain exists.
export async function getRetirementOverview(ownerId: string): Promise<RetirementOverviewView> {
  return { hasRetirementPlan: false };
}
