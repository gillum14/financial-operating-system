import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { categories } from "@/db/schema";
import type { CategoryRepository } from "@/domains/categories/repository";
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/domains/categories/types";

export class DrizzleCategoryRepository implements CategoryRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<Category | null> {
    const [row] = await this.db
      .select()
      .from(categories)
      .where(and(eq(categories.id, id), eq(categories.ownerId, ownerId), isNull(categories.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(and(eq(categories.ownerId, ownerId), isNull(categories.deletedAt)));
  }

  async listChildren(parentCategoryId: string, ownerId: string): Promise<Category[]> {
    return this.db
      .select()
      .from(categories)
      .where(
        and(
          eq(categories.parentCategoryId, parentCategoryId),
          eq(categories.ownerId, ownerId),
          isNull(categories.deletedAt),
        ),
      );
  }

  async create(input: CategoryCreateInput): Promise<Category> {
    const [row] = await this.db.insert(categories).values(input).returning();
    return row;
  }

  async update(id: string, ownerId: string, changes: CategoryUpdateInput): Promise<Category> {
    const [row] = await this.db
      .update(categories)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.ownerId, ownerId), isNull(categories.deletedAt)))
      .returning();

    if (!row) {
      throw new Error(`Category ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.ownerId, ownerId)));
  }
}
