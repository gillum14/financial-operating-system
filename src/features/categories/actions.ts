"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getCategoryService } from "@/composition/categories-composition";
import type { Category } from "@/domains/categories/types";
import { NotFoundError } from "@/domains/errors";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";
import { parseAction } from "@/lib/actions/validation";
import { CATEGORY_COLOR_OPTIONS } from "@/lib/category-color";

const categoryIdSchema = z.object({ categoryId: z.string().uuid() });

// No `ownerId` field, ever — the only owner a Server Action in this file
// will persist is requireActionUser()'s user.id.
const createCategoryInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  parentCategoryId: z.string().uuid().optional(),
  color: z.enum(CATEGORY_COLOR_OPTIONS).optional(),
  description: z.string().trim().max(100).optional(),
});

// parentCategoryId is nullable — an explicit null is how the client moves a
// subcategory back to top-level (see CategoryService.updateCategory's
// "'parentCategoryId' in parsed.data" comment). A plain omission is a
// no-op; a plain `undefined` value can't be relied on to survive a Server
// Action call the same way null does, so the client always sends one or
// the other on purpose, never leaves this ambiguous.
const updateCategoryInputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  parentCategoryId: z.string().uuid().nullable().optional(),
  color: z.enum(CATEGORY_COLOR_OPTIONS).optional(),
  description: z.string().trim().max(100).optional(),
});

const reorderCategoriesInputSchema = z.object({
  parentCategoryId: z.string().uuid().nullable(),
  orderedCategoryIds: z.array(z.string().uuid()).min(1),
});

export async function getCategory(rawInput: unknown): Promise<ActionResult<Category>> {
  return executeAction("getCategory", async () => {
    const user = await requireActionUser();
    const { categoryId } = parseAction(categoryIdSchema, rawInput);

    const category = await getCategoryService().getCategory(categoryId, user.id);
    if (!category) {
      throw new NotFoundError(`Category ${categoryId} not found for owner ${user.id}`);
    }
    return category;
  });
}

// "Active" here means "not soft-deleted" — Categories have no separate
// active/archived status (see domain-model.md § Categories and
// Classification, Implementation), so this is the complete, non-deleted
// list, exposed under this name for naming parity with the Accounts slice.
export async function listActiveCategories(): Promise<ActionResult<Category[]>> {
  return executeAction("listActiveCategories", async () => {
    const user = await requireActionUser();
    return getCategoryService().listCategories(user.id);
  });
}

export async function createCategory(rawInput: unknown): Promise<ActionResult<Category>> {
  return executeAction("createCategory", async () => {
    const user = await requireActionUser();
    const input = parseAction(createCategoryInputSchema, rawInput);

    const category = await getCategoryService().createCategory({ ...input, ownerId: user.id });
    revalidatePath("/categories");
    return category;
  });
}

export async function updateCategory(rawInput: unknown): Promise<ActionResult<Category>> {
  return executeAction("updateCategory", async () => {
    const user = await requireActionUser();
    const { categoryId, ...changes } = parseAction(updateCategoryInputSchema, rawInput);

    const category = await getCategoryService().updateCategory(categoryId, user.id, changes);
    revalidatePath("/categories");
    return category;
  });
}

// Persists a drag-and-drop reorder of one sibling group at a time — an
// owner's top-level categories (parentCategoryId: null) or one parent's
// subcategories. orderedCategoryIds must be exactly that group's current
// members (CategoryService.reorderCategories verifies this), so a stale or
// tampered client can't smuggle in a foreign, wrong-group, or archived id.
export async function reorderCategories(rawInput: unknown): Promise<ActionResult<Category[]>> {
  return executeAction("reorderCategories", async () => {
    const user = await requireActionUser();
    const { parentCategoryId, orderedCategoryIds } = parseAction(reorderCategoriesInputSchema, rawInput);

    const result = await getCategoryService().reorderCategories(user.id, parentCategoryId, orderedCategoryIds);
    revalidatePath("/categories");
    return result;
  });
}

// Soft-delete only — no restoreCategory. Archived categories disappear
// from active lists while their historical references stay intact (see
// categories-specification.md § Archiving); deletedAt is the lifecycle
// marker, and restoring a soft-deleted category is intentionally not
// implemented in this slice (see categories-model.md's Future
// Enhancements § Archived category management).
export async function deleteCategory(rawInput: unknown): Promise<ActionResult<void>> {
  return executeAction("deleteCategory", async () => {
    const user = await requireActionUser();
    const { categoryId } = parseAction(categoryIdSchema, rawInput);

    await getCategoryService().deleteCategory(categoryId, user.id);
    revalidatePath("/categories");
  });
}
