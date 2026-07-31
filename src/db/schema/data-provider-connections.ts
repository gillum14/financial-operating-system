import { index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

import { institutions } from "./institutions";
import { timestamps } from "./shared-columns";
import { users } from "./users";

// Generic, provider-agnostic connection record. No provider-specific fields
// (e.g. Plaid access tokens/item IDs) belong here — those arrive with the
// provider integration itself in a later branch.
export type DataProviderConnectionStatus = "active" | "inactive" | "error";

export const dataProviderConnections = pgTable(
  "data_provider_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    institutionId: uuid("institution_id").references(() => institutions.id, { onDelete: "set null" }),
    providerName: text("provider_name").notNull(),
    externalReference: text("external_reference"),
    status: text("status").$type<DataProviderConnectionStatus>().notNull().default("inactive"),
    connectedAt: timestamp("connected_at", { withTimezone: true }),
    ...timestamps,
  },
  (table) => [
    index("data_provider_connections_owner_id_idx").on(table.ownerId),
    index("data_provider_connections_institution_id_idx").on(table.institutionId),
  ],
);

export type DataProviderConnection = typeof dataProviderConnections.$inferSelect;
export type NewDataProviderConnection = typeof dataProviderConnections.$inferInsert;
