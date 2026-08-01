import { pgSchema, uuid } from "drizzle-orm/pg-core";

// Not a table we own or manage — this is a minimal reference stub for
// Supabase's real auth.users table (created and migrated by Supabase
// itself, with many more columns than shown here) so Drizzle can generate
// a correct foreign key from public.users.id to it. drizzle-kit generate
// will still try to emit a CREATE TABLE for this on first use; that
// statement must be stripped from the generated migration by hand — see
// the migration file's own comment for details.
const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});
