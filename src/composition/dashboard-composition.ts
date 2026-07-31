import "server-only";

import { DashboardService } from "@/application/dashboard/dashboard-service";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import { DrizzleInstitutionRepository } from "@/infrastructure/db/institutions-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

// Composition root: the one place outside src/infrastructure that is
// allowed to import it. Wires the Drizzle repository implementations into
// DashboardService against the shared `db` client (the same singleton
// src/db/client.ts already caches across Next.js dev-mode HMR reloads), so
// this only needs to run once per process.
let dashboardService: DashboardService | undefined;

export function getDashboardService(): DashboardService {
  if (!dashboardService) {
    dashboardService = new DashboardService(
      new DrizzleAccountRepository(db),
      new DrizzleInstitutionRepository(db),
      new DrizzleTransactionRepository(db),
      new DrizzleCategoryRepository(db),
    );
  }
  return dashboardService;
}
