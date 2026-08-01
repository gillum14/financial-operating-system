import { sql } from "drizzle-orm";
import { pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { authUsers } from "./auth-users";
import { timestamps } from "./shared-columns";

export const users = pgTable(
  "users",
  {
    // No defaultRandom(): this id is never independently generated. It is
    // always the id of an existing auth.users row — set explicitly by the
    // handle_new_user profile-creation trigger (see migrations), never
    // chosen by application code. ON DELETE RESTRICT (not CASCADE) is
    // deliberate: removing an auth user must not silently wipe out the
    // financial records attached to their profile.
    id: uuid("id")
      .primaryKey()
      .references(() => authUsers.id, { onDelete: "restrict" }),
    // Cached from auth.users for convenient joins/display — auth.users
    // remains the authoritative source, and no authorization decision may
    // ever be based on this column. Always stored lowercase/trimmed.
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
