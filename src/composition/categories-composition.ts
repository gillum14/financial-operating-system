import "server-only";

import { CategoryService } from "@/application/categories/service";
import { db } from "@/db/client";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

let categoryService: CategoryService | undefined;

export function getCategoryService(): CategoryService {
  if (!categoryService) {
    categoryService = new CategoryService(new DrizzleCategoryRepository(db), new DrizzleTransactionRepository(db));
  }
  return categoryService;
}
