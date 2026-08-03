"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { getTransactionsListView } from "@/composition/transactions-query";
import type { TransactionsListView } from "@/composition/transactions-query";
import { getTransactionService } from "@/composition/transactions-composition";
import { TRANSACTION_TYPES } from "@/domains/transactions/types";
import type { Transaction } from "@/domains/transactions/types";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";
import { parseAction } from "@/lib/actions/validation";

const moneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Must be a decimal amount with up to 4 places");
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

// No `ownerId`/`accountId` field, ever — a transaction never moves between
// accounts or owners through this action, matching
// TransactionUpdateInput's own immutability guarantee.
const updateTransactionInputSchema = z.object({
  transactionId: z.string().uuid(),
  categoryId: z.string().uuid().nullable().optional(),
  merchant: z.string().trim().max(200).optional(),
  originalDescription: z.string().trim().min(1).max(500).optional(),
  transactionDate: dateStringSchema.optional(),
  postingDate: dateStringSchema.optional(),
  amount: moneyStringSchema.optional(),
  isExcluded: z.boolean().optional(),
  notes: z.string().max(2000).optional(),
});

export async function updateTransaction(rawInput: unknown): Promise<ActionResult<Transaction>> {
  return executeAction("updateTransaction", async () => {
    const user = await requireActionUser();
    const { transactionId, ...changes } = parseAction(updateTransactionInputSchema, rawInput);

    const transaction = await getTransactionService().updateTransaction(transactionId, user.id, changes);
    revalidatePath("/transactions");
    return transaction;
  });
}

const listTransactionsInputSchema = z.object({
  accountId: z.string().uuid().optional(),
  categoryId: z.string().uuid().optional(),
  transactionType: z.enum(TRANSACTION_TYPES).optional(),
  dateFrom: dateStringSchema.optional(),
  dateTo: dateStringSchema.optional(),
  search: z.string().trim().max(200).optional(),
  cursor: z.string().optional(),
});

// A *read*, not a mutation — used only for incremental "Load more" fetches
// from the client, so the list can grow in place without a full-page
// navigation. The initial page load never calls this; it comes from the
// Transactions Server Component reading getTransactionsListView() directly
// (see src/app/(authenticated)/transactions/page.tsx). Every filter value
// here is client-supplied and untrusted, but harmless: ownerId always
// comes from requireActionUser(), so a crafted accountId/categoryId can
// only ever narrow this caller's own data, never reach another owner's.
export async function loadMoreTransactions(rawInput: unknown): Promise<ActionResult<TransactionsListView>> {
  return executeAction("loadMoreTransactions", async () => {
    const user = await requireActionUser();
    const params = parseAction(listTransactionsInputSchema, rawInput);

    return getTransactionsListView(user.id, params);
  });
}
