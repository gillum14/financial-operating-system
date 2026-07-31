import { index, pgTable, text, uuid, type AnyPgColumn } from "drizzle-orm/pg-core";

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
    ...timestamps,
  },
  (table) => [
    index("categories_owner_id_idx").on(table.ownerId),
    index("categories_parent_category_id_idx").on(table.parentCategoryId),
  ],
);

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
