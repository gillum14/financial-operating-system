import { createRng, fixtureId, iterateDeterministicDates, rngAmount, rngPick } from "../../deterministic";
import { accountIds, type AccountIds } from "../accounts";
import { categoryIdByName } from "../categories";
import { SEED_EARLIEST_TRANSACTION_DATE, SEED_LATEST_TRANSACTION_DATE } from "../window";
import type { TransactionDraft } from "./types";

// The two "this is realistic bank data, not a tidy demo" cases every real
// household's transaction feed eventually has:
//
//  - Uncategorized: categoryId is genuinely null, description is exactly
//    the kind of opaque processor text real feeds produce (a POS
//    reference number, a generic ACH descriptor) — nothing here is
//    miscategorized by mistake, it's deliberately never assigned one at
//    all, the same honest-gap posture the rest of this app takes toward
//    data it doesn't have.
//  - Excluded: isExcluded: true — employer-reimbursed purchases and
//    pending/duplicate-look charges, exactly the kind of row a user would
//    manually exclude from spending totals without deleting the record.
const RNG_SEED = 0x455443; // "EDC" — arbitrary, fixed, never changes.

const UNCATEGORIZED_DESCRIPTIONS = [
  "POS PURCHASE REF 4471829",
  "ACH DEBIT MISC 88213",
  "ONLINE PMT REF 552091",
  "DEBIT CARD PURCHASE 001",
  "MISC MERCHANT SETTLEMENT",
  "CARD PURCHASE - RETRY 2",
];

function buildUncategorized(ownerId: string, ids: AccountIds, rng: () => number): TransactionDraft[] {
  const dates = iterateDeterministicDates(SEED_EARLIEST_TRANSACTION_DATE, SEED_LATEST_TRANSACTION_DATE, 30, 9, rng);
  const accounts = [ids.checking, ids.creditCard, ids.cashbackCreditCard];

  return dates.map((date, index) => ({
    id: fixtureId(ownerId, `txn:edge:uncategorized:${index}`),
    accountId: rngPick(rng, accounts),
    categoryId: null,
    transactionDate: date,
    originalDescription: rngPick(rng, UNCATEGORIZED_DESCRIPTIONS),
    amount: `-${rngAmount(rng, 8, 65)}`,
    transactionType: "expense",
  }));
}

interface ExcludedFixture {
  key: string;
  accountId: string;
  categoryName: string;
  description: string;
  merchant: string;
  amountRange: [number, number];
}

function excludedFixtures(ids: AccountIds): ExcludedFixture[] {
  return [
    {
      key: "reimbursed-travel",
      accountId: ids.creditCard,
      categoryName: "Flights",
      description: "SUMMIT AIRWAYS - CLIENT TRIP (REIMBURSED)",
      merchant: "Summit Airways",
      amountRange: [420, 780],
    },
    {
      key: "reimbursed-lodging",
      accountId: ids.creditCard,
      categoryName: "Lodging",
      description: "RIVERSTONE INN - CLIENT TRIP (REIMBURSED)",
      merchant: "Riverstone Inn & Suites",
      amountRange: [380, 640],
    },
    {
      key: "reimbursed-meal",
      accountId: ids.creditCard,
      categoryName: "Restaurants",
      description: "MAPLE & VINE KITCHEN - CLIENT DINNER (REIMBURSED)",
      merchant: "Maple & Vine Kitchen",
      amountRange: [60, 160],
    },
    {
      key: "pending-duplicate",
      accountId: ids.cashbackCreditCard,
      categoryName: "Electronics",
      description: "CIRCUIT & SOUND ELECTRONICS - PENDING DUPLICATE",
      merchant: "Circuit & Sound Electronics",
      amountRange: [40, 200],
    },
  ];
}

function buildExcluded(
  ownerId: string,
  categoryId: Record<string, string>,
  ids: AccountIds,
  rng: () => number,
): TransactionDraft[] {
  const dates = iterateDeterministicDates(SEED_EARLIEST_TRANSACTION_DATE, SEED_LATEST_TRANSACTION_DATE, 48, 14, rng);
  const fixtures = excludedFixtures(ids);

  return dates.map((date, index) => {
    const fixture = fixtures[index % fixtures.length];
    return {
      id: fixtureId(ownerId, `txn:edge:excluded:${fixture.key}:${index}`),
      accountId: fixture.accountId,
      categoryId: categoryId[fixture.categoryName],
      transactionDate: date,
      originalDescription: fixture.description,
      merchant: fixture.merchant,
      amount: `-${rngAmount(rng, fixture.amountRange[0], fixture.amountRange[1])}`,
      transactionType: "expense",
      isExcluded: true,
    };
  });
}

export function buildEdgeCaseTransactions(ownerId: string): TransactionDraft[] {
  const rng = createRng(RNG_SEED);
  const ids = accountIds(ownerId);
  const categoryId = categoryIdByName(ownerId);
  return [...buildUncategorized(ownerId, ids, rng), ...buildExcluded(ownerId, categoryId, ids, rng)];
}
