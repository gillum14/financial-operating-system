import type { Category } from "@/domains/categories/types";

import type { CategoriesOverviewView, SubcategoryRow, TopLevelCategoryRow } from "./categories-views";

// Pure shaping logic, deliberately separated from src/composition/
// categories-query.ts's repository I/O — takes already-fetched categories
// and per-category transaction counts and returns a presentation-ready
// view. Buildable in a unit test with plain arrays, no database (mirrors
// transactions-list-view.ts / net-worth-breakdown.ts).
export function buildCategoriesOverview(input: {
  categories: Category[];
  transactionCountByCategoryId: Map<string, number>;
  totalTransactionsThisMonth: number;
}): CategoriesOverviewView {
  const { categories, transactionCountByCategoryId, totalTransactionsThisMonth } = input;

  const topLevel = categories.filter((category) => category.parentCategoryId === null);
  const childrenByParentId = new Map<string, Category[]>();
  for (const category of categories) {
    if (category.parentCategoryId) {
      const siblings = childrenByParentId.get(category.parentCategoryId) ?? [];
      siblings.push(category);
      childrenByParentId.set(category.parentCategoryId, siblings);
    }
  }

  const topLevelCategories: TopLevelCategoryRow[] = topLevel.map((category) => {
    const subcategories: SubcategoryRow[] = (childrenByParentId.get(category.id) ?? []).map((child) => ({
      category: child,
      transactionCount: transactionCountByCategoryId.get(child.id) ?? 0,
    }));

    return {
      category,
      transactionCount: transactionCountByCategoryId.get(category.id) ?? 0,
      subcategories,
    };
  });

  const lastUpdated =
    categories.length === 0
      ? null
      : new Date(Math.max(...categories.map((category) => category.updatedAt.getTime())));

  return {
    topLevelCategories,
    totalCategories: categories.length,
    topLevelCategoryCount: topLevel.length,
    totalSubcategories: categories.length - topLevel.length,
    totalTransactionsThisMonth,
    lastUpdated,
  };
}
