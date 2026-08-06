import type { Category, CategoryCreateInput, CategoryUpdateInput } from "./types";

export interface CategoryRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<Category | null>;
  listForOwner(ownerId: string): Promise<Category[]>;
  listChildren(parentCategoryId: string, ownerId: string): Promise<Category[]>;
  create(input: CategoryCreateInput): Promise<Category>;
  update(id: string, ownerId: string, changes: CategoryUpdateInput): Promise<Category>;
  softDelete(id: string, ownerId: string): Promise<void>;
  // Sets sortOrder = index within orderedIds for each matching, owned,
  // non-deleted category, atomically. Callers (CategoryService) are
  // responsible for verifying orderedIds is exactly one sibling group
  // (same parentCategoryId) before calling this — the repository only
  // enforces ownership, not sibling-group membership.
  reorder(ownerId: string, orderedIds: string[]): Promise<Category[]>;
}
