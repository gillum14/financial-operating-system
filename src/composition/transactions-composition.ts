import "server-only";

import { TransactionService } from "@/application/transactions/service";
import { db } from "@/db/client";
import { DrizzleAccountRepository } from "@/infrastructure/db/accounts-repository";
import { DrizzleCategoryRepository } from "@/infrastructure/db/categories-repository";
import { DrizzleTransactionRepository } from "@/infrastructure/db/transactions-repository";

let transactionService: TransactionService | undefined;

export function getTransactionService(): TransactionService {
  if (!transactionService) {
    transactionService = new TransactionService(
      new DrizzleTransactionRepository(db),
      new DrizzleAccountRepository(db),
      new DrizzleCategoryRepository(db),
    );
  }
  return transactionService;
}
