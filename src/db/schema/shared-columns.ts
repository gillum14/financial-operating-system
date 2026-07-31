import { timestamp } from "drizzle-orm/pg-core";

// Applied to every authoritative table: created/updated are always set,
// deleted_at is the soft-delete marker (null = not deleted).
export const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
};
