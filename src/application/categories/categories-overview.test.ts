import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { Category } from "@/domains/categories/types";

import { buildCategoriesOverview } from "./categories-overview";

function makeCategory(overrides: Partial<Category> = {}): Category {
  const now = new Date();
  return {
    id: randomUUID(),
    ownerId: randomUUID(),
    name: "Category",
    parentCategoryId: null,
    color: null,
    description: null,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    ...overrides,
  };
}

describe("buildCategoriesOverview", () => {
  it("groups subcategories under their parent and resolves real transaction counts", () => {
    const parent = makeCategory({ name: "Income" });
    const child = makeCategory({ name: "Salary", parentCategoryId: parent.id });

    const view = buildCategoriesOverview({
      categories: [parent, child],
      transactionCountByCategoryId: new Map([
        [parent.id, 5],
        [child.id, 3],
      ]),
      totalTransactionsThisMonth: 8,
    });

    expect(view.topLevelCategories).toEqual([
      {
        category: parent,
        transactionCount: 5,
        subcategories: [{ category: child, transactionCount: 3 }],
      },
    ]);
    expect(view.totalCategories).toBe(2);
    expect(view.topLevelCategoryCount).toBe(1);
    expect(view.totalSubcategories).toBe(1);
    expect(view.totalTransactionsThisMonth).toBe(8);
  });

  it("defaults an uncounted category's transactionCount to 0, not undefined", () => {
    const category = makeCategory();

    const view = buildCategoriesOverview({
      categories: [category],
      transactionCountByCategoryId: new Map(),
      totalTransactionsThisMonth: 0,
    });

    expect(view.topLevelCategories[0].transactionCount).toBe(0);
  });

  it("gives a top-level category with no children an empty subcategories array", () => {
    const category = makeCategory();

    const view = buildCategoriesOverview({
      categories: [category],
      transactionCountByCategoryId: new Map(),
      totalTransactionsThisMonth: 0,
    });

    expect(view.topLevelCategories[0].subcategories).toEqual([]);
  });

  it("computes lastUpdated as the max updatedAt across every category, parent or child", () => {
    const older = makeCategory({ updatedAt: new Date("2026-01-01T00:00:00Z") });
    const newer = makeCategory({
      parentCategoryId: older.id,
      updatedAt: new Date("2026-06-01T00:00:00Z"),
    });

    const view = buildCategoriesOverview({
      categories: [older, newer],
      transactionCountByCategoryId: new Map(),
      totalTransactionsThisMonth: 0,
    });

    expect(view.lastUpdated).toEqual(new Date("2026-06-01T00:00:00Z"));
  });

  it("returns an empty view with lastUpdated null when the owner has no categories", () => {
    const view = buildCategoriesOverview({
      categories: [],
      transactionCountByCategoryId: new Map(),
      totalTransactionsThisMonth: 0,
    });

    expect(view).toEqual({
      topLevelCategories: [],
      totalCategories: 0,
      topLevelCategoryCount: 0,
      totalSubcategories: 0,
      totalTransactionsThisMonth: 0,
      lastUpdated: null,
    });
  });
});
