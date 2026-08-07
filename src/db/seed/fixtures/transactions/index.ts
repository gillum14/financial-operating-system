import type { NewTransaction } from "../../../schema";
import { buildEdgeCaseTransactions } from "./edge-cases";
import { buildRecurringTransactions } from "./recurring";
import { buildTransferTransactions } from "./transfers";
import { buildVariableSpendingTransactions } from "./variable-spending";

// The one place ownerId gets stamped onto every generated transaction row
// — see types.ts's TransactionDraft. Also the one place all four
// generators (the fixed-schedule half, the irregular-spending half, the
// paired-transfer half, and the deliberately-messy edge cases) come
// together into the single flat array the seed script inserts.
export function buildTransactions(ownerId: string): NewTransaction[] {
  const drafts = [
    ...buildRecurringTransactions(ownerId),
    ...buildVariableSpendingTransactions(ownerId),
    ...buildTransferTransactions(ownerId),
    ...buildEdgeCaseTransactions(ownerId),
  ];

  return drafts.map((draft) => ({ ...draft, ownerId }));
}
