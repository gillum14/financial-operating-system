import { index, integer, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

import { timestamps } from "./shared-columns";
import { users } from "./users";

export const categories = pgTable(
  "categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    parentCategoryId: uuid("parent_category_id").references((): AnyPgColumn => categories.id, {
      onDelete: "restrict",
    }),
    // Both optional and purely presentational — a null color falls back to
    // the deterministic categoryTone(name) hash everywhere a category's
    // color is shown (see src/lib/category-color.ts).
    color: text("color"),
    description: text("description"),
    // User-defined display order, scoped to (ownerId, parentCategoryId) —
    // i.e. one ordering sequence for an owner's top-level categories, and a
    // separate one per parent for its subcategories. Always server-computed
    // (append-to-end on create/move, explicit set via CategoryService's
    // reorderCategories) — never client-supplied directly. See
    // categories-model.md § Category Ordering.
    sortOrder: integer("sort_order").notNull().default(0),
    ...timestamps,
  },
  (table) => [
    index("categories_owner_id_idx").on(table.ownerId),
    index("categories_parent_category_id_idx").on(table.parentCategoryId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
