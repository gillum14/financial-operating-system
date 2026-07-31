import { char, date, index, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { institutions } from "./institutions";
import { timestamps } from "./shared-columns";
import { users } from "./users";

export type AccountType =
  | "checking"
  | "savings"
  | "credit-card"
  | "mortgage"
  | "personal-loan"
  | "vehicle-loan"
  | "cash"
  | "investment"
  | "retirement"
  | "property"
  | "other-asset"
  | "other-liability";

export type AccountStatus = "active" | "archived";

export type AccountBalanceSource = "manual" | "computed";

export const accounts = pgTable(
  "accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    institutionId: uuid("institution_id").references(() => institutions.id, { onDelete: "set null" }),
    name: text("name").notNull(),
    accountType: text("account_type").$type<AccountType>().notNull(),
    maskedAccountNumber: text("masked_account_number"),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    status: text("status").$type<AccountStatus>().notNull().default("active"),
    balanceSource: text("balance_source").$type<AccountBalanceSource>().notNull().default("manual"),
    currentBalance: numeric("current_balance", { precision: 19, scale: 4, mode: "string" }),
    openingDate: date("opening_date", { mode: "string" }),
    closingDate: date("closing_date", { mode: "string" }),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("accounts_owner_id_idx").on(table.ownerId),
    index("accounts_institution_id_idx").on(table.institutionId),
  ],
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
