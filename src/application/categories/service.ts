import { z } from "zod";

import type { CategoryRepository } from "@/domains/categories/repository";
import type { Category, CategoryCreateInput, CategoryUpdateInput } from "@/domains/categories/types";
import { ConflictError, NotFoundError, ValidationError } from "@/domains/errors";
import type { TransactionRepository } from "@/domains/transactions/repository";
import { CATEGORY_COLOR_OPTIONS } from "@/lib/category-color";

const createCategorySchema = z.object({
  ownerId: z.string().uuid(),
  name: z.string().trim().min(1).max(200),
  parentCategoryId: z.string().uuid().optional(),
  color: z.enum(CATEGORY_COLOR_OPTIONS).optional(),
  description: z.string().trim().max(100).optional(),
});

// parentCategoryId is nullable here (unlike create's) because update is the
// only way to express "move this category back to top-level" — a plain
// `undefined` is indistinguishable from "field not included, leave
// unchanged" once it round-trips through a Server Action, so callers that
// want to clear the parent must send an explicit `null`. See
// CategoryFormDialog's submit handler.
const updateCategorySchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  color: z.enum(CATEGORY_COLOR_OPTIONS).optional(),
  description: z.string().trim().max(100).optional(),
});

// "Append to end" means one past the *highest* sortOrder currently in the
// group, not the group's size — a promotion/move out of a group (see
// updateCategory below) leaves a gap behind rather than renumbering the
// siblings left in it, so `siblings.length` can already be a value some
// remaining sibling holds. Using max()+1 instead means a later append can
// never collide with an existing sortOrder in the same group, gaps or not.
function nextSortOrder(siblings: Category[]): number {
  return siblings.length === 0 ? 0 : Math.max(...siblings.map((row) => row.sortOrder)) + 1;
}

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

    // Always appended to the end of its sibling group — user-defined order
    // is never alphabetical or creation-order by accident (see
    // categories-model.md § Category Ordering). sortOrder is never
    // accepted as client input (see createCategorySchema above); it is
    // computed here, the one place a new category's position is decided.
    const siblings = await this.listSiblings(parsed.data.ownerId, parsed.data.parentCategoryId ?? null);

    return this.categoryRepository.create({ ...parsed.data, sortOrder: nextSortOrder(siblings) });
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

    const updates: CategoryUpdateInput = { ...parsed.data };

    // "parentCategoryId" in parsed.data — not just checking truthiness —
    // matters here: a request that omits parentCategoryId entirely must
    // leave the current parent untouched, while one that explicitly sends
    // null must clear it. Both parse to a falsy parsed.data.parentCategoryId,
    // but only one of them is an in-key request to move the category at all.
    if ("parentCategoryId" in parsed.data) {
      const current = await this.categoryRepository.getByIdForOwner(id, ownerId);
      if (!current) {
        throw new NotFoundError(`Category ${id} not found for owner ${ownerId}`);
      }

      const newParentId = parsed.data.parentCategoryId ?? null;
      if (newParentId === id) {
        throw new ValidationError("A category cannot be its own parent");
      }

      if (newParentId !== current.parentCategoryId) {
        if (newParentId) {
          await this.assertValidParent(newParentId, ownerId);

          // A category that already has its own subcategories can't be
          // nested under another category — that would produce a third
          // hierarchy level, which the domain never allows (see
          // categories-model.md § Category Hierarchy). Moving *to*
          // top-level (newParentId === null) never has this problem: a
          // top-level category is always allowed to have children.
          const ownChildren = await this.categoryRepository.listChildren(id, ownerId);
          if (ownChildren.length > 0) {
            throw new ConflictError(
              `Category ${id} has its own subcategories and cannot be moved under another category`,
            );
          }
        }

        // Moving into a different sibling group — including top-level —
        // always appends to the end of the destination group, the same
        // rule createCategory uses, rather than keeping a sortOrder value
        // that may already belong to something else there.
        const destinationSiblings = await this.listSiblings(ownerId, newParentId, id);
        updates.sortOrder = nextSortOrder(destinationSiblings);
      }
    }

    return this.categoryRepository.update(id, ownerId, updates);
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

  // Persists a drag-and-drop reorder of one sibling group — either an
  // owner's top-level categories (parentCategoryId === null) or one
  // parent's subcategories. orderedIds must be exactly the current members
  // of that group (same set, any order) — this is what stops a client from
  // smuggling a foreign/soft-deleted/wrong-group id into a reorder call, or
  // silently dropping a sibling the UI didn't know about.
  async reorderCategories(ownerId: string, parentCategoryId: string | null, orderedIds: string[]): Promise<Category[]> {
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new ValidationError("orderedCategoryIds must not contain duplicates");
    }

    const siblings = await this.listSiblings(ownerId, parentCategoryId);
    const siblingIds = new Set(siblings.map((row) => row.id));
    const isExactSiblingSet = orderedIds.length === siblings.length && orderedIds.every((id) => siblingIds.has(id));
    if (!isExactSiblingSet) {
      throw new ValidationError("orderedCategoryIds must contain exactly the current sibling categories");
    }

    return this.categoryRepository.reorder(ownerId, orderedIds);
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

  // The current members of one sibling group — an owner's top-level
  // categories (parentCategoryId === null) or one parent's subcategories —
  // optionally excluding a given id (used when computing a destination
  // group's size for a category that's being moved, so it doesn't count
  // itself if it happens to already be a member of that group).
  private async listSiblings(ownerId: string, parentCategoryId: string | null, excludeId?: string): Promise<Category[]> {
    const siblings = parentCategoryId
      ? await this.categoryRepository.listChildren(parentCategoryId, ownerId)
      : (await this.categoryRepository.listForOwner(ownerId)).filter((row) => row.parentCategoryId === null);

    return excludeId ? siblings.filter((row) => row.id !== excludeId) : siblings;
  }
}
