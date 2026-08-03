import "server-only";

import type { InvestmentsOverviewView } from "@/application/investments/investments-views";

export type { InvestmentsOverviewView };

// Server-only query orchestration for the Investments workspace — same
// role as goals-query.ts/missions-query.ts, with no repository behind it
// yet: there is no Investments domain (no schema table, no
// DrizzlePortfolioRepository) to query. Kept as a real composition
// function, not inlined in the page, so the Investments page already
// follows the read path (Server Component -> composition -> view model)
// it will use once a real repository exists.
// eslint-disable-next-line @typescript-eslint/no-unused-vars -- ownerId will scope the real repository query once an Investments domain exists.
export async function getInvestmentsOverview(ownerId: string): Promise<InvestmentsOverviewView> {
  return { hasInvestments: false };
}
