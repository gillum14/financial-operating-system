import type { Category, NewCategory } from "@/db/schema/categories";

export type { Category };

export type CategoryCreateInput = Omit<NewCategory, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type CategoryUpdateInput = Partial<
  Omit<NewCategory, "id" | "ownerId" | "createdAt" | "updatedAt" | "deletedAt">
>;
