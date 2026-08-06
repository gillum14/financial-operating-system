import type { Category } from "@/domains/categories/types";

// Presentation-shaped view models for the Categories workspace, kept
// outside src/composition/ (server-only) so "use client" components can
// import these *types* without pulling in a composition-root module —
// same pattern as every other feature (Transactions, Budgets, Reports,
// Net Worth).

export interface SubcategoryRow {
  category: Category;
  // Real COUNT(*) of transactions referencing this exact category — see
  // categories-query.ts. Not an estimate.
  transactionCount: number;
}

export interface TopLevelCategoryRow {
  category: Category;
  transactionCount: number;
  subcategories: SubcategoryRow[];
}

export interface CategoriesOverviewView {
  topLevelCategories: TopLevelCategoryRow[];
  // Grand total: every category and subcategory the owner has.
  totalCategories: number;
  // Of totalCategories, how many are top-level (no parent) — the caption
  // under the Total Categories tile.
  topLevelCategoryCount: number;
  totalSubcategories: number;
  // Real COUNT(*) of the owner's transactions dated within the current
  // calendar month — not scoped to any particular category.
  totalTransactionsThisMonth: number;
  // Latest updatedAt across every one of the owner's categories, or null
  // when the owner has no categories yet. A real timestamp, never a
  // fabricated "just now".
  lastUpdated: Date | null;
}
