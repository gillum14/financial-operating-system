import type { Account, AccountCreateInput, AccountUpdateInput } from "./types";

export interface AccountRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<Account | null>;
  listForOwner(ownerId: string): Promise<Account[]>;
  create(input: AccountCreateInput): Promise<Account>;
  update(id: string, ownerId: string, changes: AccountUpdateInput): Promise<Account>;
  archive(id: string, ownerId: string): Promise<Account>;
  softDelete(id: string, ownerId: string): Promise<void>;
}
