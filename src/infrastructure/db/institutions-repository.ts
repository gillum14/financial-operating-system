import { and, eq, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { institutions } from "@/db/schema";
import type { InstitutionRepository } from "@/domains/institutions/repository";
import type { Institution, InstitutionCreateInput, InstitutionUpdateInput } from "@/domains/institutions/types";

export class DrizzleInstitutionRepository implements InstitutionRepository {
  constructor(private readonly db: DbClient) {}

  async getById(id: string): Promise<Institution | null> {
    const [row] = await this.db
      .select()
      .from(institutions)
      .where(and(eq(institutions.id, id), isNull(institutions.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async list(): Promise<Institution[]> {
    return this.db.select().from(institutions).where(isNull(institutions.deletedAt));
  }

  async create(input: InstitutionCreateInput): Promise<Institution> {
    const [row] = await this.db.insert(institutions).values(input).returning();
    return row;
  }

  async update(id: string, changes: InstitutionUpdateInput): Promise<Institution> {
    const [row] = await this.db
      .update(institutions)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(institutions.id, id), isNull(institutions.deletedAt)))
      .returning();

    if (!row) {
      throw new Error(`Institution ${id} not found`);
    }

    return row;
  }

  async softDelete(id: string): Promise<void> {
    await this.db.update(institutions).set({ deletedAt: new Date() }).where(eq(institutions.id, id));
  }
}
