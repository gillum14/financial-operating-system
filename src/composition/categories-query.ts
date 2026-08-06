import "server-only";

import { buildCategoriesOverview } from "@/application/categories/categories-overview";
import type { CategoriesOverviewView } from "@/application/categories/categories-views";
import { getCategoryService } from "@/composition/categories-composition";
import { db } from "@/db/client";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

export type { CategoriesOverviewView };

// Server-only query orchestration for the Categories workspace — same
// role as transactions-query.ts / net-worth-query.ts. Reads the category
// list through the existing CategoryService (not a second, parallel
// DrizzleCategoryRepository instance) so this file can't drift from the
// validation/hierarchy rules the service already enforces on writes.
//
// TECH DEBT: per-category transaction counts are fetched with one
// countForOwner() call per category (N+1), not a single grouped-count
// query. Fine for the realistic category counts this app expects (tens,
// not thousands) but worth revisiting with a dedicated repository method
// if that assumption stops holding.
const transactionRepository = new DrizzleTransactionRepository(db);

function startOfCurrentMonth(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
}

export async function getCategoriesOverview(ownerId: string): Promise<CategoriesOverviewView> {
  const categories = await getCategoryService().listCategories(ownerId);

  const [transactionCounts, totalTransactionsThisMonth] = await Promise.all([
    Promise.all(
      categories.map(async (category) => [category.id, await transactionRepository.countForOwner(ownerId, { categoryId: category.id, includeExcluded: true })] as const),
    ),
    transactionRepository.countForOwner(ownerId, { dateFrom: startOfCurrentMonth(), includeExcluded: true }),
  ]);

  return buildCategoriesOverview({
    categories,
    transactionCountByCategoryId: new Map(transactionCounts),
    totalTransactionsThisMonth,
  });
}
