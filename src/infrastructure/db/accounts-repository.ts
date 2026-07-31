import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { accounts } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";
import type { AccountRepository } from "@/domains/accounts/repository";
import type { Account, AccountCreateInput, AccountUpdateInput } from "@/domains/accounts/types";

export class DrizzleAccountRepository implements AccountRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<Account | null> {
    const [row] = await this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.id, id), eq(accounts.ownerId, ownerId), isNull(accounts.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<Account[]> {
    return this.db
      .select()
      .from(accounts)
      .where(and(eq(accounts.ownerId, ownerId), isNull(accounts.deletedAt)));
  }

  async create(input: AccountCreateInput): Promise<Account> {
    const [row] = await this.db.insert(accounts).values(input).returning();
    return row;
  }

  async update(id: string, ownerId: string, changes: AccountUpdateInput): Promise<Account> {
    const [row] = await this.db
      .update(accounts)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.ownerId, ownerId), isNull(accounts.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Account ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async archive(id: string, ownerId: string): Promise<Account> {
    const [row] = await this.db
      .update(accounts)
      .set({ status: "archived", updatedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.ownerId, ownerId), isNull(accounts.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Account ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.db
      .update(accounts)
      .set({ deletedAt: new Date() })
      .where(and(eq(accounts.id, id), eq(accounts.ownerId, ownerId)));
  }
}
