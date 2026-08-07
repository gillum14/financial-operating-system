import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import type { DbClient } from "@/db/client";
import { budgetAllocationAdjustments, budgetAllocations, budgetPeriods } from "@/db/schema";
import type {
  BudgetAllocationAdjustmentRepository,
  BudgetAllocationRepository,
  BudgetPeriodRepository,
} from "@/domains/budgets/repository";
import type {
  BudgetAllocation,
  BudgetAllocationAdjustment,
  BudgetAllocationAdjustmentCreateInput,
  BudgetAllocationCreateInput,
  BudgetAllocationListFilter,
  BudgetAllocationUpdateInput,
  BudgetPeriod,
  BudgetPeriodCreateInput,
  BudgetPeriodStatusUpdateInput,
} from "@/domains/budgets/types";
import { NotFoundError } from "@/domains/errors";

export class DrizzleBudgetPeriodRepository implements BudgetPeriodRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<BudgetPeriod | null> {
    const [row] = await this.db
      .select()
      .from(budgetPeriods)
      .where(and(eq(budgetPeriods.id, id), eq(budgetPeriods.ownerId, ownerId), isNull(budgetPeriods.deletedAt)))
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string): Promise<BudgetPeriod[]> {
    return this.db
      .select()
      .from(budgetPeriods)
      .where(and(eq(budgetPeriods.ownerId, ownerId), isNull(budgetPeriods.deletedAt)))
      .orderBy(desc(budgetPeriods.periodStart));
  }

  async getActiveForOwner(ownerId: string): Promise<BudgetPeriod | null> {
    const [row] = await this.db
      .select()
      .from(budgetPeriods)
      .where(
        and(eq(budgetPeriods.ownerId, ownerId), eq(budgetPeriods.status, "active"), isNull(budgetPeriods.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  }

  async create(input: BudgetPeriodCreateInput): Promise<BudgetPeriod> {
    const [row] = await this.db.insert(budgetPeriods).values(input).returning();
    return row;
  }

  async updateStatus(id: string, ownerId: string, changes: BudgetPeriodStatusUpdateInput): Promise<BudgetPeriod> {
    const [row] = await this.db
      .update(budgetPeriods)
      .set({ ...changes, updatedAt: new Date() })
      .where(and(eq(budgetPeriods.id, id), eq(budgetPeriods.ownerId, ownerId), isNull(budgetPeriods.deletedAt)))
      .returning();

    if (!row) {
      throw new NotFoundError(`Budget period ${id} not found for owner ${ownerId}`);
    }

    return row;
  }
}

export class DrizzleBudgetAllocationRepository implements BudgetAllocationRepository {
  constructor(private readonly db: DbClient) {}

  async getByIdForOwner(id: string, ownerId: string): Promise<BudgetAllocation | null> {
    const [row] = await this.db
      .select()
      .from(budgetAllocations)
      .where(
        and(eq(budgetAllocations.id, id), eq(budgetAllocations.ownerId, ownerId), isNull(budgetAllocations.deletedAt)),
      )
      .limit(1);
    return row ?? null;
  }

  async listForOwner(ownerId: string, filter?: BudgetAllocationListFilter): Promise<BudgetAllocation[]> {
    return this.db
      .select()
      .from(budgetAllocations)
      .where(
        and(
          eq(budgetAllocations.ownerId, ownerId),
          isNull(budgetAllocations.deletedAt),
          filter?.budgetPeriodId ? eq(budgetAllocations.budgetPeriodId, filter.budgetPeriodId) : undefined,
        ),
      )
      .orderBy(budgetAllocations.displayOrder, budgetAllocations.createdAt);
  }

  async create(input: BudgetAllocationCreateInput & { displayOrder: number }): Promise<BudgetAllocation> {
    const [row] = await this.db.insert(budgetAllocations).values(input).returning();
    return row;
  }

  async update(id: string, ownerId: string, changes: BudgetAllocationUpdateInput): Promise<BudgetAllocation> {
    const [row] = await this.db
      .update(budgetAllocations)
      .set({ ...changes, updatedAt: new Date() })
      .where(
        and(eq(budgetAllocations.id, id), eq(budgetAllocations.ownerId, ownerId), isNull(budgetAllocations.deletedAt)),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(`Budget allocation ${id} not found for owner ${ownerId}`);
    }

    return row;
  }

  async softDelete(id: string, ownerId: string): Promise<void> {
    const [row] = await this.db
      .update(budgetAllocations)
      .set({ deletedAt: new Date() })
      .where(
        and(eq(budgetAllocations.id, id), eq(budgetAllocations.ownerId, ownerId), isNull(budgetAllocations.deletedAt)),
      )
      .returning();

    if (!row) {
      throw new NotFoundError(`Budget allocation ${id} not found for owner ${ownerId}`);
    }
  }
}

// Insert-only — no update/softDelete methods exist because adjustment rows
// are never mutated once written (see budgets.ts's schema comment).
export class DrizzleBudgetAllocationAdjustmentRepository implements BudgetAllocationAdjustmentRepository {
  constructor(private readonly db: DbClient) {}

  async listForOwnerAndAllocations(ownerId: string, budgetAllocationIds: string[]): Promise<BudgetAllocationAdjustment[]> {
    if (budgetAllocationIds.length === 0) return [];
    return this.db
      .select()
      .from(budgetAllocationAdjustments)
      .where(
        and(
          eq(budgetAllocationAdjustments.ownerId, ownerId),
          inArray(budgetAllocationAdjustments.budgetAllocationId, budgetAllocationIds),
        ),
      )
      .orderBy(desc(budgetAllocationAdjustments.createdAt));
  }

  async create(input: BudgetAllocationAdjustmentCreateInput): Promise<BudgetAllocationAdjustment> {
    const [row] = await this.db.insert(budgetAllocationAdjustments).values(input).returning();
    return row;
  }
}
