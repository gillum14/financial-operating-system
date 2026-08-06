import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { categories } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";
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
      .where(and(eq(categories.ownerId, ownerId), isNull(categories.deletedAt)))
      .orderBy(categories.sortOrder, categories.createdAt);
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
      )
      .orderBy(categories.sortOrder, categories.createdAt);
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
      throw new NotFoundError(`Category ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    // .returning() + a NotFoundError check (matching update()/archive()
    // above) is required here, not optional: without it, a cross-owner
    // call matches zero rows and Postgres reports that as an unremarkable
    // 0-row UPDATE, not an error — silently returning success to the
    // caller ("false success") instead of failing.
    const [row] = await this.db
      .update(categories)
      .set({ deletedAt: new Date() })
      .where(and(eq(categories.id, id), eq(categories.ownerId, ownerId), isNull(categories.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Category ${id} not found for owner ${ownerId}`);
    }
  }

  // One transaction per reorder, not a single bulk statement: this repo
  // has no bulk-CASE-update helper elsewhere, and the per-id NotFoundError
  // check below (same "false success" concern as softDelete) needs each
  // row's own affected-count, which a single multi-row UPDATE can't give
  // per id. orderedIds is expected to be small (one owner's sibling group,
  // realistically under a few dozen), so N sequential statements inside one
  // transaction is fine.
  async reorder(ownerId: string, orderedIds: string[]): Promise<Category[]> {
    return this.db.transaction(async (tx) => {
      const updated: Category[] = [];
      for (let index = 0; index < orderedIds.length; index += 1) {
        const id = orderedIds[index];
        const [row] = await tx
          .update(categories)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(and(eq(categories.id, id), eq(categories.ownerId, ownerId), isNull(categories.deletedAt)))
          .returning();

        if (!row) {
          throw new NotFoundError(`Category ${id} not found for owner ${ownerId}`);
        }
        updated.push(row);
      }
      return updated;
    });
  }
}
