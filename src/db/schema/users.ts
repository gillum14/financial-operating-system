import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./shared-columns";

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull(),
    displayName: text("display_name").notNull(),
    ...timestamps,
  },
  (table) => [
    // Active users must have unique emails; a soft-deleted user must not
    // permanently block that email from being reused.
    uniqueIndex("users_email_active_unique_idx").on(table.email).where(sql`deleted_at IS NULL`),
  ],
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
