import {
  ACCOUNT_BALANCE_SOURCES,
  ACCOUNT_STATUSES,
  ACCOUNT_TYPES,
  type Account,
  type AccountBalanceSource,
  type AccountStatus,
  type AccountType,
  type NewAccount,
} from "@/db/schema/accounts";

export { ACCOUNT_BALANCE_SOURCES, ACCOUNT_STATUSES, ACCOUNT_TYPES };
export type { Account, AccountBalanceSource, AccountStatus, AccountType };

export type AccountCreateInput = Omit<NewAccount, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type AccountUpdateInput = Partial<
  Omit<NewAccount, "id" | "ownerId" | "createdAt" | "updatedAt" | "deletedAt">
>;
