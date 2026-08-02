"use server";

import { z } from "zod";

import { getAccountService } from "@/composition/accounts-composition";
import { ACCOUNT_BALANCE_SOURCES, ACCOUNT_TYPES } from "@/domains/accounts/types";
import type { Account } from "@/domains/accounts/types";
import { NotFoundError } from "@/domains/errors";
import { requireActionUser } from "@/lib/actions/context";
import { executeAction } from "@/lib/actions/execute";
import type { ActionResult } from "@/lib/actions/types";
import { parseAction } from "@/lib/actions/validation";

// Duplicated from src/application/accounts/service.ts rather than shared —
// that duplication already exists between the accounts and transactions
// services today, so this follows the established (if imperfect) local
// pattern instead of introducing a new shared module unprompted.
const moneyStringSchema = z.string().regex(/^-?\d+(\.\d{1,4})?$/, "Must be a decimal amount with up to 4 places");
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const accountIdSchema = z.object({ accountId: z.string().uuid() });

// No `ownerId` field, ever — the only owner a Server Action in this file
// will persist is requireActionUser()'s user.id. No `status` field either:
// status transitions are a distinct lifecycle operation with their own
// intent (archiveAccount/restoreAccount below), not a generic mutable
// field, even though the underlying grant permits it at the SQL layer.
const createAccountInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  accountType: z.enum(ACCOUNT_TYPES),
  institutionId: z.string().uuid().optional(),
  maskedAccountNumber: z.string().trim().max(50).optional(),
  currency: z.string().length(3).optional(),
  balanceSource: z.enum(ACCOUNT_BALANCE_SOURCES).optional(),
  currentBalance: moneyStringSchema.optional(),
  openingDate: dateStringSchema.optional(),
  closingDate: dateStringSchema.optional(),
  notes: z.string().max(2000).optional(),
});

const updateAccountInputSchema = z.object({
  accountId: z.string().uuid(),
  name: z.string().trim().min(1).max(200).optional(),
  accountType: z.enum(ACCOUNT_TYPES).optional(),
  institutionId: z.string().uuid().optional(),
  maskedAccountNumber: z.string().trim().max(50).optional(),
  currency: z.string().length(3).optional(),
  balanceSource: z.enum(ACCOUNT_BALANCE_SOURCES).optional(),
  currentBalance: moneyStringSchema.optional(),
  openingDate: dateStringSchema.optional(),
  closingDate: dateStringSchema.optional(),
  notes: z.string().max(2000).optional(),
});

export async function getAccount(rawInput: unknown): Promise<ActionResult<Account>> {
  return executeAction("getAccount", async () => {
    const user = await requireActionUser();
    const { accountId } = parseAction(accountIdSchema, rawInput);

    const account = await getAccountService().getAccount(accountId, user.id);
    if (!account) {
      throw new NotFoundError(`Account ${accountId} not found for owner ${user.id}`);
    }
    return account;
  });
}

export async function listActiveAccounts(): Promise<ActionResult<Account[]>> {
  return executeAction("listActiveAccounts", async () => {
    const user = await requireActionUser();
    return getAccountService().listActiveAccounts(user.id);
  });
}

export async function listArchivedAccounts(): Promise<ActionResult<Account[]>> {
  return executeAction("listArchivedAccounts", async () => {
    const user = await requireActionUser();
    return getAccountService().listArchivedAccounts(user.id);
  });
}

export async function createAccount(rawInput: unknown): Promise<ActionResult<Account>> {
  return executeAction("createAccount", async () => {
    const user = await requireActionUser();
    const input = parseAction(createAccountInputSchema, rawInput);

    return getAccountService().createAccount({ ...input, ownerId: user.id });
  });
}

export async function updateAccount(rawInput: unknown): Promise<ActionResult<Account>> {
  return executeAction("updateAccount", async () => {
    const user = await requireActionUser();
    const { accountId, ...changes } = parseAction(updateAccountInputSchema, rawInput);

    return getAccountService().updateAccount(accountId, user.id, changes);
  });
}

export async function archiveAccount(rawInput: unknown): Promise<ActionResult<Account>> {
  return executeAction("archiveAccount", async () => {
    const user = await requireActionUser();
    const { accountId } = parseAction(accountIdSchema, rawInput);

    return getAccountService().archiveAccount(accountId, user.id);
  });
}

export async function restoreAccount(rawInput: unknown): Promise<ActionResult<Account>> {
  return executeAction("restoreAccount", async () => {
    const user = await requireActionUser();
    const { accountId } = parseAction(accountIdSchema, rawInput);

    return getAccountService().restoreAccount(accountId, user.id);
  });
}
