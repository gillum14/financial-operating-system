import { boolean, date, index, numeric, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { accounts } from "./accounts";
import { categories } from "./categories";
import { timestamps } from "./shared-columns";
import { users } from "./users";

export const TRANSACTION_TYPES = ["income", "expense", "transfer"] as const;
export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => accounts.id, { onDelete: "restrict" }),
    categoryId: uuid("category_id").references(() => categories.id, { onDelete: "set null" }),
    transactionDate: date("transaction_date", { mode: "string" }).notNull(),
    postingDate: date("posting_date", { mode: "string" }),
    originalDescription: text("original_description").notNull(),
    merchant: text("merchant"),
    amount: numeric("amount", { precision: 19, scale: 4, mode: "string" }).notNull(),
    transactionType: text("transaction_type").$type<TransactionType>().notNull(),
    isExcluded: boolean("is_excluded").notNull().default(false),
    notes: text("notes"),
    ...timestamps,
  },
  (table) => [
    index("transactions_owner_id_idx").on(table.ownerId),
    index("transactions_account_id_idx").on(table.accountId),
    index("transactions_category_id_idx").on(table.categoryId),
    index("transactions_transaction_date_idx").on(table.transactionDate),
  ],
);

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;
