import type { Account, AccountCreateInput, AccountStatus, AccountUpdateInput } from "./types";

export interface AccountRepository {
  getByIdForOwner(id: string, ownerId: string): Promise<Account | null>;
  // `status` is an optional filter, not a replacement for listForOwner's
  // existing all-statuses behavior — omitting it must keep returning every
  // non-deleted account, since the dashboard composition already depends on
  // that.
  listForOwner(ownerId: string, status?: AccountStatus): Promise<Account[]>;
  create(input: AccountCreateInput): Promise<Account>;
  update(id: string, ownerId: string, changes: AccountUpdateInput): Promise<Account>;
  archive(id: string, ownerId: string): Promise<Account>;
  restore(id: string, ownerId: string): Promise<Account>;
  softDelete(id: string, ownerId: string): Promise<void>;
}
