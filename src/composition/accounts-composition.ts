import "server-only";

import { AccountService } from "@/application/accounts/service";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleInstitutionRepository } from "@/infrastructure/db/institutions-repository";

let accountService: AccountService | undefined;

export function getAccountService(): AccountService {
  if (!accountService) {
    accountService = new AccountService(new DrizzleAccountRepository(db), new DrizzleInstitutionRepository(db));
  }
  return accountService;
}
