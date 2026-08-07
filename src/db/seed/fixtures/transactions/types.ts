import type { NewTransaction } from "../../../schema";

// Every generator in fixtures/transactions/ builds rows without an
// ownerId — there is exactly one place that stamps ownerId onto every
// generated row (buildTransactions() in index.ts), so it's structurally
// impossible for a generator to accidentally attach the wrong owner or
// omit one.
export type TransactionDraft = Omit<NewTransaction, "ownerId">;
