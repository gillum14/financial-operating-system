"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getBudgetService } from "@/composition/budgets-composition";
import type { BudgetAllocation, BudgetPeriod } from "@/domains/budgets/types";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";
import { parseAction } from "@/lib/actions/validation";

const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const budgetPeriodIdSchema = z.object({ budgetPeriodId: z.string().uuid() });
const budgetAllocationIdSchema = z.object({ budgetAllocationId: z.string().uuid() });

// No `ownerId` field, ever — the only owner a Server Action in this file
// will persist is requireActionUser()'s user.id.
const createBudgetPeriodInputSchema = z.object({
  periodStart: dateStringSchema,
  periodEnd: dateStringSchema,
});

const addAllocationInputSchema = z.object({
  budgetPeriodId: z.string().uuid(),
  categoryId: z.string().uuid(),
  plannedAmount: z.number().nonnegative().finite(),
});

const updateAllocationInputSchema = z.object({
  budgetAllocationId: z.string().uuid(),
  plannedAmount: z.number().nonnegative().finite(),
});

export async function createBudgetPeriod(rawInput: unknown): Promise<ActionResult<BudgetPeriod>> {
  return executeAction("createBudgetPeriod", async () => {
    const user = await requireActionUser();
    const input = parseAction(createBudgetPeriodInputSchema, rawInput);

    const period = await getBudgetService().createBudgetPeriod({ ...input, ownerId: user.id });
    revalidatePath("/budgets");
    return period;
  });
}

export async function activateBudgetPeriod(rawInput: unknown): Promise<ActionResult<BudgetPeriod>> {
  return executeAction("activateBudgetPeriod", async () => {
    const user = await requireActionUser();
    const { budgetPeriodId } = parseAction(budgetPeriodIdSchema, rawInput);

    const period = await getBudgetService().activateBudgetPeriod(budgetPeriodId, user.id);
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return period;
  });
}

export async function completeBudgetPeriod(rawInput: unknown): Promise<ActionResult<BudgetPeriod>> {
  return executeAction("completeBudgetPeriod", async () => {
    const user = await requireActionUser();
    const { budgetPeriodId } = parseAction(budgetPeriodIdSchema, rawInput);

    const period = await getBudgetService().completeBudgetPeriod(budgetPeriodId, user.id);
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return period;
  });
}

// Archiving is not deletion — no hard-delete path exists for budget
// history at any layer (repository, RLS grants, or this action). See
// BudgetService.archiveBudgetPeriod.
export async function archiveBudgetPeriod(rawInput: unknown): Promise<ActionResult<BudgetPeriod>> {
  return executeAction("archiveBudgetPeriod", async () => {
    const user = await requireActionUser();
    const { budgetPeriodId } = parseAction(budgetPeriodIdSchema, rawInput);

    const period = await getBudgetService().archiveBudgetPeriod(budgetPeriodId, user.id);
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return period;
  });
}

export async function addBudgetAllocation(rawInput: unknown): Promise<ActionResult<BudgetAllocation>> {
  return executeAction("addBudgetAllocation", async () => {
    const user = await requireActionUser();
    const input = parseAction(addAllocationInputSchema, rawInput);

    const allocation = await getBudgetService().addAllocation({ ...input, ownerId: user.id });
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return allocation;
  });
}

export async function updateBudgetAllocation(rawInput: unknown): Promise<ActionResult<BudgetAllocation>> {
  return executeAction("updateBudgetAllocation", async () => {
    const user = await requireActionUser();
    const { budgetAllocationId, plannedAmount } = parseAction(updateAllocationInputSchema, rawInput);

    const allocation = await getBudgetService().updateAllocationAmount(budgetAllocationId, user.id, plannedAmount);
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
    return allocation;
  });
}

// Soft-delete only — no DELETE grant exists on budget_allocations at any
// layer, matching every other owned table in this schema.
export async function removeBudgetAllocation(rawInput: unknown): Promise<ActionResult<void>> {
  return executeAction("removeBudgetAllocation", async () => {
    const user = await requireActionUser();
    const { budgetAllocationId } = parseAction(budgetAllocationIdSchema, rawInput);

    await getBudgetService().removeAllocation(budgetAllocationId, user.id);
    revalidatePath("/budgets");
    revalidatePath("/dashboard");
  });
}
