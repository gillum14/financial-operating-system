import type { Account, AccountBalanceSource, AccountStatus, AccountType, NewAccount } from "@/db/schema/accounts";

export type { Account, AccountBalanceSource, AccountStatus, AccountType };

export type AccountCreateInput = Omit<NewAccount, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type AccountUpdateInput = Partial<
  Omit<NewAccount, "id" | "ownerId" | "createdAt" | "updatedAt" | "deletedAt">
>;
