import { z } from "zod";

import type { CategoryRepository } from "@/domains/categories/repository";
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/domains/categories/types";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";
import type { TransactionRepository } from "@/domains/transactions/repository";

const createCategorySchema = z.object({
  ownerId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  parentCategoryId: z.string().uuid().optional(),
});

const updateCategorySchema = createCategorySchema.omit({ ownerId: true }).partial();

export class CategoryService {
  constructor(
    private readonly categoryRepository: CategoryRepository,
    private readonly transactionRepository: TransactionRepository,
  ) {}

  async createCategory(input: CategoryCreateInput): Promise<Category> {
    const parsed = createCategorySchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    if (parsed.data.parentCategoryId) {
      await this.assertValidParent(parsed.data.parentCategoryId, parsed.data.ownerId);
    }

    return this.categoryRepository.create(parsed.data);
  }

  async listCategories(ownerId: string): Promise<Category[]> {
    return this.categoryRepository.listForOwner(ownerId);
  }

  async getCategory(id: string, ownerId: string): Promise<Category | null> {
    return this.categoryRepository.getByIdForOwner(id, ownerId);
  }

  async updateCategory(id: string, ownerId: string, changes: CategoryUpdateInput): Promise<Category> {
    const parsed = updateCategorySchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    if (parsed.data.parentCategoryId) {
      if (parsed.data.parentCategoryId === id) {
        throw new ValidationError("A category cannot be its own parent");
      }
      await this.assertValidParent(parsed.data.parentCategoryId, ownerId);
    }

    return this.categoryRepository.update(id, ownerId, parsed.data);
  }

  // Soft-deleting a category never trips the DB's RESTRICT constraint (that
  // only fires on a hard DELETE), so this guard is what actually prevents
  // "deleting" a category that historical data still depends on.
  async deleteCategory(id: string, ownerId: string): Promise<void> {
    const children = await this.categoryRepository.listChildren(id, ownerId);
    if (children.length > 0) {
      throw new ConflictError(`Category ${id} still has subcategories and cannot be deleted`);
    }

    const referencingTransactions = await this.transactionRepository.listForOwner(ownerId, {
      categoryId: id,
      includeExcluded: true,
    });
    if (referencingTransactions.length > 0) {
      throw new ConflictError(`Category ${id} is still referenced by transactions and cannot be deleted`);
    }

    await this.categoryRepository.softDelete(id, ownerId);
  }

  // Enforces the two-level hierarchy limit (top-level category → direct
  // subcategory, no deeper) by rejecting any attempt to attach a child to a
  // category that is itself already a subcategory. Also doubles as the
  // cross-owner/existence check: getByIdForOwner already excludes other
  // owners' rows and soft-deleted rows, so an invalid parent — missing,
  // foreign, or deleted — surfaces as the same generic NotFoundError,
  // never revealing which case applied.
  private async assertValidParent(parentCategoryId: string, ownerId: string): Promise<void> {
    const parent = await this.categoryRepository.getByIdForOwner(parentCategoryId, ownerId);
    if (!parent) {
      throw new NotFoundError(`Category ${parentCategoryId} not found for this owner`);
    }
    if (parent.parentCategoryId !== null) {
      throw new ConflictError(`Category ${parentCategoryId} is already a subcategory and cannot have children`);
    }
  }
}
