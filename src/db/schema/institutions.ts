import { pgTable, text, uuid } from "drizzle-orm/pg-core";

import { timestamps } from "./shared-columns";

export const institutions = pgTable("institutions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  providerName: text("provider_name"),
  logoUrl: text("logo_url"),
  ...timestamps,
});

export type Institution = typeof institutions.$inferSelect;
export type NewInstitution = typeof institutions.$inferInsert;
