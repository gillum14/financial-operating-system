import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { dataProviderConnections } from "@/db/schema";
import type { DataProviderConnectionRepository } from "@/domains/data-provider-connections/repository";
import type {
  DataProviderConnection,
  DataProviderConnectionCreateInput,
  DataProviderConnectionUpdateInput,
} from "@/domains/data-provider-connections/types";

export class DrizzleDataProviderConnectionRepository implements DataProviderConnectionRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<DataProviderConnection | null> {
    const [row] = await this.db
      .select()
      .from(dataProviderConnections)
      .where(
        and(
          eq(dataProviderConnections.id, id),
          eq(dataProviderConnections.ownerId, ownerId),
          isNull(dataProviderConnections.deletedAt),
        ),
      )
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<DataProviderConnection[]> {
    return this.db
      .select()
      .from(dataProviderConnections)
      .where(and(eq(dataProviderConnections.ownerId, ownerId), isNull(dataProviderConnections.deletedAt)));
  }

  async create(input: DataProviderConnectionCreateInput): Promise<DataProviderConnection> {
    const [row] = await this.db.insert(dataProviderConnections).values(input).returning();
    return row;
  }

  async update(
    id: string,
    ownerId: string,
    changes: DataProviderConnectionUpdateInput,
  ): Promise<DataProviderConnection> {
    const [row] = await this.db
      .update(dataProviderConnections)
      .set({ ...changes, updatedAt: new Date() })
      .where(
        and(
          eq(dataProviderConnections.id, id),
          eq(dataProviderConnections.ownerId, ownerId),
          isNull(dataProviderConnections.deletedAt),
        ),
      )
      .returning();

    if (!row) {
      throw new Error(`Data provider connection ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    await this.db
      .update(dataProviderConnections)
      .set({ deletedAt: new Date() })
      .where(and(eq(dataProviderConnections.id, id), eq(dataProviderConnections.ownerId, ownerId)));
  }
}
