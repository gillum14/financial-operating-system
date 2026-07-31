import type { Category, CategoryCreateInput, CategoryUpdateInput } from "./types";

export interface CategoryRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<Category | null>;
  listForOwner(ownerId: string): Promise<Category[]>;
  listChildren(parentCategoryId: string, ownerId: string): Promise<Category[]>;
  create(input: CategoryCreateInput): Promise<Category>;
  update(id: string, ownerId: string, changes: CategoryUpdateInput): Promise<Category>;
  softDelete(id: string, ownerId: string): Promise<void>;
}
