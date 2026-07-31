import { z } from "zod";

import type { AccountRepository } from "@/domains/accounts/repository";
import { ACCOUNT_BALANCE_SOURCES, ACCOUNT_STATUSES, ACCOUNT_TYPES } from "@/domains/accounts/types";
import type { Account, AccountCreateInput, AccountUpdateInput } from "@/domains/accounts/types";
import { NotFoundError, ValidationError } from "@/domains/errors";
import type { InstitutionRepository } from "@/domains/institutions/repository";

const moneyStringSchema = z
  .string()
  .regex(/^-?\d+(\.\d{1,4})?$/, "Must be a decimal amount with up to 4 places");
const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be a YYYY-MM-DD date");

const createAccountSchema = z.object({
  ownerId: z.string().uuid(),
  institutionId: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(200),
  accountType: z.enum(ACCOUNT_TYPES),
  maskedAccountNumber: z.string().trim().max(50).optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(ACCOUNT_STATUSES).optional(),
  balanceSource: z.enum(ACCOUNT_BALANCE_SOURCES).optional(),
  currentBalance: moneyStringSchema.optional(),
  openingDate: dateStringSchema.optional(),
  closingDate: dateStringSchema.optional(),
  notes: z.string().max(2000).optional(),
});

const updateAccountSchema = createAccountSchema.omit({ ownerId: true }).partial();

export class AccountService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly institutionRepository: InstitutionRepository,
  ) {}

  async createAccount(input: AccountCreateInput): Promise<Account> {
    const parsed = createAccountSchema.safeParse(input);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    if (parsed.data.institutionId) {
      await this.assertInstitutionExists(parsed.data.institutionId);
    }

    return this.accountRepository.create(parsed.data);
  }

  async listAccounts(ownerId: string): Promise<Account[]> {
    return this.accountRepository.listForOwner(ownerId);
  }

  async getAccount(id: string, ownerId: string): Promise<Account | null> {
    return this.accountRepository.getByIdForOwner(id, ownerId);
  }

  async updateAccount(id: string, ownerId: string, changes: AccountUpdateInput): Promise<Account> {
    const parsed = updateAccountSchema.safeParse(changes);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.message);
    }

    if (parsed.data.institutionId) {
      await this.assertInstitutionExists(parsed.data.institutionId);
    }

    return this.accountRepository.update(id, ownerId, parsed.data);
  }

  async archiveAccount(id: string, ownerId: string): Promise<Account> {
    return this.accountRepository.archive(id, ownerId);
  }

  async deleteAccount(id: string, ownerId: string): Promise<void> {
    await this.accountRepository.softDelete(id, ownerId);
  }

  private async assertInstitutionExists(institutionId: string): Promise<void> {
    const institution = await this.institutionRepository.getById(institutionId);
    if (!institution) {
      throw new NotFoundError(`Institution ${institutionId} not found`);
    }
  }
}
