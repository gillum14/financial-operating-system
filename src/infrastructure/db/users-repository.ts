import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { users } from "@/db/schema";
import { NotFoundError } from "@/domains/errors";
import type { UserRepository } from "@/domains/users/repository";
import type { User, UserCreateInput, UserUpdateInput } from "@/domains/users/types";

export class DrizzleUserRepository implements UserRepository {
  constructor(private readonly db: DbClient) {}

  async getById(id: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async getByEmail(email: string): Promise<User | null> {
    const [row] = await this.db
      .select()
      .from(users)
      .where(and(eq(users.email, email), isNull(users.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async create(input: UserCreateInput): Promise<User> {
    const [row] = await this.db.insert(users).values(input).returning();
    return row;
  }

  async update(id: string, changes: UserUpdateInput): Promise<User> {
    const [row] = await this.db
      .update(users)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(users.id, id), isNull(users.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`User ${id} not found`);
    }

    return row;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, id));
  }
}
