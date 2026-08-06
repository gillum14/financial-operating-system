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

const updateCategoryInputSchema = z.object({
  categoryId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  parentCategoryId: z.string().uuid().optional(),
  color: z.enum(CATEGORY_COLOR_OPTIONS).optional(),
  description: z.string().trim().max(100).optional(),
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

// Soft-delete only — no archiveCategory/restoreCategory pair. Categories
// have no status column to make a reversible archived state meaningful
// (see domain-model.md); deletedAt is the only lifecycle marker, and
// restoring a soft-deleted category is intentionally not implemented in
// this slice.
export async function deleteCategory(rawInput: unknown): Promise<ActionResult<void>> {
  return executeAction("deleteCategory", async () => {
    const user = await requireActionUser();
    const { categoryId } = parseAction(categoryIdSchema, rawInput);

    await getCategoryService().deleteCategory(categoryId, user.id);
    revalidatePath("/categories");
  });
}
