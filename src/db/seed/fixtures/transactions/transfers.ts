import { addMonths, compareDates, createRng, fixtureId, rngAmount } from "../../deterministic";
import { accountIds, type AccountIds } from "../accounts";
import { SEED_EARLIEST_TRANSACTION_DATE, SEED_LATEST_TRANSACTION_DATE } from "../window";
import type { TransactionDraft } from "./types";

// Every transfer between the seed owner's own accounts, as a matched pair
// of rows — one negative leg on the source account, one positive leg of
// the exact same magnitude on the destination account, both
// transactionType: "transfer", both categoryId: null (matching the
// original seed data's own convention — see data.ts's original
// TRANSFER TO/FROM SAVINGS pair). computeSpendingSummary() and
// DashboardService both explicitly exclude "transfer" rows from
// income/expense totals (see spending-aggregation.ts,
// dashboard-service.ts), so none of these can ever inflate income or
// spending — that exclusion is enforced by the app, this fixture just
// has to keep using the right transactionType.
const RNG_SEED = 0x545246; // "TRF" — arbitrary, fixed, never changes.

interface MonthlyTransferStream {
  key: string;
  dayOfMonth: number;
  fromAccountId: string;
  toAccountId: string;
  fromDescription: string;
  toDescription: string;
  amountRange: [number, number];
}

function monthStartAndClamp(monthStart: string, day: number): string {
  const daysInMonth = new Date(
    Date.UTC(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)), 0),
  ).getUTCDate();
  const clampedDay = Math.min(day, daysInMonth);
  return `${monthStart.slice(0, 8)}${String(clampedDay).padStart(2, "0")}`;
}

function buildMonthlyTransferStream(ownerId: string, stream: MonthlyTransferStream, rng: () => number): TransactionDraft[] {
  const rows: TransactionDraft[] = [];
  let monthStart = `${SEED_EARLIEST_TRANSACTION_DATE.slice(0, 8)}01`;
  let occurrence = 0;

  while (compareDates(monthStart, SEED_LATEST_TRANSACTION_DATE) <= 0) {
    const date = monthStartAndClamp(monthStart, stream.dayOfMonth);
    if (compareDates(date, SEED_LATEST_TRANSACTION_DATE) <= 0) {
      const amount = rngAmount(rng, stream.amountRange[0], stream.amountRange[1]);
      rows.push(
        {
          id: fixtureId(ownerId, `txn:transfer:${stream.key}:out:${occurrence}`),
          accountId: stream.fromAccountId,
          categoryId: null,
          transactionDate: date,
          originalDescription: stream.fromDescription,
          amount: `-${amount}`,
          transactionType: "transfer",
        },
        {
          id: fixtureId(ownerId, `txn:transfer:${stream.key}:in:${occurrence}`),
          accountId: stream.toAccountId,
          categoryId: null,
          transactionDate: date,
          originalDescription: stream.toDescription,
          amount,
          transactionType: "transfer",
        },
      );
      occurrence += 1;
    }
    monthStart = addMonths(monthStart, 1);
  }
  return rows;
}

function monthlyStreams(ids: AccountIds): MonthlyTransferStream[] {
  return [
    {
      key: "savings-sweep",
      dayOfMonth: 15,
      fromAccountId: ids.checking,
      toAccountId: ids.householdSavings,
      fromDescription: "TRANSFER TO HOUSEHOLD SAVINGS",
      toDescription: "TRANSFER FROM CHECKING",
      amountRange: [250, 400],
    },
    {
      key: "cc-payment",
      dayOfMonth: 24,
      fromAccountId: ids.checking,
      toAccountId: ids.creditCard,
      fromDescription: "PAYMENT TO REWARDS CREDIT CARD",
      toDescription: "PAYMENT RECEIVED - THANK YOU",
      amountRange: [280, 520],
    },
    {
      key: "cashback-cc-payment",
      dayOfMonth: 26,
      fromAccountId: ids.checking,
      toAccountId: ids.cashbackCreditCard,
      fromDescription: "PAYMENT TO CASH BACK CREDIT CARD",
      toDescription: "PAYMENT RECEIVED - THANK YOU",
      amountRange: [180, 340],
    },
    {
      key: "roth-contribution",
      dayOfMonth: 6,
      fromAccountId: ids.checking,
      toAccountId: ids.rothIra,
      fromDescription: "TRANSFER TO ROTH IRA",
      toDescription: "CONTRIBUTION FROM CHECKING",
      amountRange: [300, 300],
    },
  ];
}

// Occasional (not monthly) transfers — an emergency-fund top-up a few
// times a year, and a brokerage contribution roughly every other month.
function buildOccasionalTransferStream(
  ownerId: string,
  key: string,
  fromAccountId: string,
  toAccountId: string,
  fromDescription: string,
  toDescription: string,
  amountRange: [number, number],
  monthOffsets: number[],
  dayOfMonth: number,
  rng: () => number,
): TransactionDraft[] {
  return monthOffsets.flatMap((offset, index) => {
    const monthStart = addMonths(`${SEED_EARLIEST_TRANSACTION_DATE.slice(0, 8)}01`, offset);
    const date = monthStartAndClamp(monthStart, dayOfMonth);
    if (compareDates(date, SEED_LATEST_TRANSACTION_DATE) > 0) return [];
    const amount = rngAmount(rng, amountRange[0], amountRange[1]);
    return [
      {
        id: fixtureId(ownerId, `txn:transfer:${key}:out:${index}`),
        accountId: fromAccountId,
        categoryId: null,
        transactionDate: date,
        originalDescription: fromDescription,
        amount: `-${amount}`,
        transactionType: "transfer" as const,
      },
      {
        id: fixtureId(ownerId, `txn:transfer:${key}:in:${index}`),
        accountId: toAccountId,
        categoryId: null,
        transactionDate: date,
        originalDescription: toDescription,
        amount,
        transactionType: "transfer" as const,
      },
    ];
  });
}

export function buildTransferTransactions(ownerId: string): TransactionDraft[] {
  const rng = createRng(RNG_SEED);
  const ids = accountIds(ownerId);

  const monthly = monthlyStreams(ids).flatMap((stream) => buildMonthlyTransferStream(ownerId, stream, rng));

  const emergencyTopUps = buildOccasionalTransferStream(
    ownerId,
    "emergency-topup",
    ids.checking,
    ids.emergencySavings,
    "TRANSFER TO EMERGENCY FUND",
    "TRANSFER FROM CHECKING",
    [400, 800],
    [1, 5, 9, 13, 17],
    9,
    rng,
  );

  const brokerageContributions = buildOccasionalTransferStream(
    ownerId,
    "brokerage-contribution",
    ids.checking,
    ids.brokerage,
    "TRANSFER TO BROKERAGE ACCOUNT",
    "CONTRIBUTION FROM CHECKING",
    [200, 600],
    [0, 2, 4, 6, 8, 10, 12, 14, 16],
    12,
    rng,
  );

  return [...monthly, ...emergencyTopUps, ...brokerageContributions];
}
