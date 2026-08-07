import { addDays, addMonths, compareDates, createRng, fixtureId, rngAmount } from "../../deterministic";
import { accountIds, ACCOUNT_CD_OPENING_DATE, type AccountIds } from "../accounts";
import { categoryIdByName } from "../categories";
import { SEED_EARLIEST_TRANSACTION_DATE, SEED_LATEST_TRANSACTION_DATE } from "../window";
import type { TransactionDraft } from "./types";

// Fixed-schedule transactions: the same merchant/amount-ish/category shows
// up every month (or every two weeks, or every quarter) for the whole
// window. This is deliberately the "boring, predictable" half of the
// dataset — bills, payroll, subscriptions, interest — complementing
// variable-spending.ts's irregular half.
//
// A 401(k) contribution is realistically payroll-deducted before it ever
// reaches checking, so it's intentionally never modeled as a transaction
// row here — its account balance simply grows on its own (see
// accounts.ts's currentBalance), matching this app's existing "balances
// are stored facts, not a ledger replay" convention (see
// dashboard-service.ts).
const RNG_SEED = 0x415448; // "ATH" — arbitrary, fixed, never changes.

interface MonthlyStream {
  key: string;
  dayOfMonth: number;
  accountId: string;
  categoryName: string;
  merchant: string;
  description: string;
  amountRange: [number, number];
  type: "income" | "expense";
  // Only generate occurrences on/after this date — defaults to the window
  // start; the CD's interest stream overrides this to its opening date.
  startDate?: string;
}

function clampDayOfMonth(monthStart: string, day: number): string {
  const daysInMonth = new Date(
    Date.UTC(Number(monthStart.slice(0, 4)), Number(monthStart.slice(5, 7)), 0),
  ).getUTCDate();
  const clampedDay = Math.min(day, daysInMonth);
  return `${monthStart.slice(0, 8)}${String(clampedDay).padStart(2, "0")}`;
}

function buildMonthlyStream(
  ownerId: string,
  categoryId: Record<string, string>,
  stream: MonthlyStream,
  rng: () => number,
): TransactionDraft[] {
  const rows: TransactionDraft[] = [];
  const start = stream.startDate ?? SEED_EARLIEST_TRANSACTION_DATE;
  let monthStart = `${start.slice(0, 8)}01`;
  let occurrence = 0;

  while (compareDates(monthStart, SEED_LATEST_TRANSACTION_DATE) <= 0) {
    const date = clampDayOfMonth(monthStart, stream.dayOfMonth);
    if (compareDates(date, start) >= 0 && compareDates(date, SEED_LATEST_TRANSACTION_DATE) <= 0) {
      const [min, max] = stream.amountRange;
      const magnitude = rngAmount(rng, min, max);
      rows.push({
        id: fixtureId(ownerId, `txn:recurring:${stream.key}:${occurrence}`),
        accountId: stream.accountId,
        categoryId: categoryId[stream.categoryName],
        transactionDate: date,
        originalDescription: stream.description,
        merchant: stream.merchant,
        amount: stream.type === "income" ? magnitude : `-${magnitude}`,
        transactionType: stream.type,
      });
      occurrence += 1;
    }
    monthStart = addMonths(monthStart, 1);
  }
  return rows;
}

function buildBiweeklyStream(
  ownerId: string,
  categoryId: Record<string, string>,
  key: string,
  accountId: string,
  categoryName: string,
  merchant: string,
  description: string,
  amountRange: [number, number],
  rng: () => number,
): TransactionDraft[] {
  const rows: TransactionDraft[] = [];
  let date = SEED_EARLIEST_TRANSACTION_DATE;
  let occurrence = 0;
  while (compareDates(date, SEED_LATEST_TRANSACTION_DATE) <= 0) {
    rows.push({
      id: fixtureId(ownerId, `txn:recurring:${key}:${occurrence}`),
      accountId,
      categoryId: categoryId[categoryName],
      transactionDate: date,
      originalDescription: description,
      merchant,
      amount: rngAmount(rng, amountRange[0], amountRange[1]),
      transactionType: "income",
    });
    occurrence += 1;
    date = addDays(date, 14);
  }
  return rows;
}

function buildQuarterlyStream(
  ownerId: string,
  categoryId: Record<string, string>,
  key: string,
  accountId: string,
  categoryName: string,
  merchant: string,
  description: string,
  amountRange: [number, number],
  rng: () => number,
): TransactionDraft[] {
  const rows: TransactionDraft[] = [];
  let date = clampDayOfMonth(`${SEED_EARLIEST_TRANSACTION_DATE.slice(0, 8)}01`, 15);
  let occurrence = 0;
  while (compareDates(date, SEED_LATEST_TRANSACTION_DATE) <= 0) {
    rows.push({
      id: fixtureId(ownerId, `txn:recurring:${key}:${occurrence}`),
      accountId,
      categoryId: categoryId[categoryName],
      transactionDate: date,
      originalDescription: description,
      merchant,
      amount: rngAmount(rng, amountRange[0], amountRange[1]),
      transactionType: "income",
    });
    occurrence += 1;
    date = addMonths(date, 3);
  }
  return rows;
}

// A handful of occasional (not monthly) charges/fees at deterministic
// fixed offsets from window start, since neither credit card interest nor
// bank fees hit every single month for a well-managed household.
function buildOccasional(
  ownerId: string,
  categoryId: Record<string, string>,
  key: string,
  accountId: string,
  categoryName: string,
  merchant: string,
  description: string,
  amountRange: [number, number],
  monthOffsets: number[],
  dayOfMonth: number,
  rng: () => number,
): TransactionDraft[] {
  return monthOffsets.map((offset, index) => {
    const monthStart = addMonths(`${SEED_EARLIEST_TRANSACTION_DATE.slice(0, 8)}01`, offset);
    const date = clampDayOfMonth(monthStart, dayOfMonth);
    return {
      id: fixtureId(ownerId, `txn:recurring:${key}:${index}`),
      accountId,
      categoryId: categoryId[categoryName],
      transactionDate: date,
      originalDescription: description,
      merchant,
      amount: `-${rngAmount(rng, amountRange[0], amountRange[1])}`,
      transactionType: "expense",
    };
  });
}

function monthlyStreams(ids: AccountIds): MonthlyStream[] {
  return [
    {
      key: "mortgage",
      dayOfMonth: 1,
      accountId: ids.checking,
      categoryName: "Mortgage Payment",
      merchant: "Cascade Community Bank",
      description: "CASCADE COMMUNITY BANK MORTGAGE PMT",
      amountRange: [2150, 2150],
      type: "expense",
    },
    {
      key: "auto-loan",
      dayOfMonth: 5,
      accountId: ids.checking,
      categoryName: "Auto Loan Payment",
      merchant: "Harbor Trust Credit Union",
      description: "HARBOR TRUST AUTO LOAN PMT",
      amountRange: [410, 410],
      type: "expense",
    },
    {
      key: "home-insurance",
      dayOfMonth: 10,
      accountId: ids.checking,
      categoryName: "Home Insurance",
      merchant: "Northgate Insurance",
      description: "NORTHGATE INSURANCE HOMEOWNERS",
      amountRange: [118, 128],
      type: "expense",
    },
    {
      key: "auto-insurance",
      dayOfMonth: 10,
      accountId: ids.checking,
      categoryName: "Auto Insurance",
      merchant: "Northgate Insurance",
      description: "NORTHGATE INSURANCE AUTO",
      amountRange: [92, 104],
      type: "expense",
    },
    {
      key: "health-insurance",
      dayOfMonth: 3,
      accountId: ids.checking,
      categoryName: "Health Insurance",
      merchant: "Summit Health Plans",
      description: "SUMMIT HEALTH PLANS PREMIUM",
      amountRange: [255, 275],
      type: "expense",
    },
    {
      key: "electric",
      dayOfMonth: 14,
      accountId: ids.checking,
      categoryName: "Electric",
      merchant: "Northgate Electric",
      description: "NORTHGATE ELECTRIC CO-OP",
      amountRange: [78, 225],
      type: "expense",
    },
    {
      key: "water-sewer",
      dayOfMonth: 16,
      accountId: ids.checking,
      categoryName: "Water & Sewer",
      merchant: "Cascade Water District",
      description: "CASCADE WATER DISTRICT",
      amountRange: [38, 72],
      type: "expense",
    },
    {
      key: "internet-cable",
      dayOfMonth: 18,
      accountId: ids.checking,
      categoryName: "Internet & Cable",
      merchant: "FiberLine Communications",
      description: "FIBERLINE COMMUNICATIONS",
      amountRange: [89.99, 89.99],
      type: "expense",
    },
    {
      key: "daycare",
      dayOfMonth: 2,
      accountId: ids.checking,
      categoryName: "Daycare",
      merchant: "Little Sprouts Learning Center",
      description: "LITTLE SPROUTS LEARNING CENTER",
      amountRange: [940, 980],
      type: "expense",
    },
    {
      key: "streaming-a",
      dayOfMonth: 20,
      accountId: ids.creditCard,
      categoryName: "Streaming Services",
      merchant: "StreamFlix",
      description: "STREAMFLIX MONTHLY",
      amountRange: [15.99, 15.99],
      type: "expense",
    },
    {
      key: "streaming-b",
      dayOfMonth: 20,
      accountId: ids.creditCard,
      categoryName: "Streaming Services",
      merchant: "TuneWave Music",
      description: "TUNEWAVE MUSIC MONTHLY",
      amountRange: [9.99, 9.99],
      type: "expense",
    },
    {
      key: "software",
      dayOfMonth: 25,
      accountId: ids.cashbackCreditCard,
      categoryName: "Software & Apps",
      merchant: "CloudSuite Office",
      description: "CLOUDSUITE OFFICE SUBSCRIPTION",
      amountRange: [12.99, 12.99],
      type: "expense",
    },
    {
      key: "gym",
      dayOfMonth: 1,
      accountId: ids.cashbackCreditCard,
      // No dedicated "Fitness" category exists — tagged directly to the
      // "Personal & Shopping" parent, the same "a transaction can reference
      // a top-level category directly, not only a subcategory" pattern the
      // original seed data already used for Transportation/Utilities/Income.
      categoryName: "Personal & Shopping",
      merchant: "Riverside Fitness Club",
      description: "RIVERSIDE FITNESS CLUB",
      amountRange: [45, 45],
      type: "expense",
    },
    {
      key: "interest-emergency-savings",
      dayOfMonth: 28,
      accountId: ids.emergencySavings,
      categoryName: "Interest Income",
      merchant: "Cascade Community Bank",
      description: "CASCADE COMMUNITY BANK INTEREST PAID",
      amountRange: [8, 15],
      type: "income",
    },
    {
      key: "interest-household-savings",
      dayOfMonth: 28,
      accountId: ids.householdSavings,
      categoryName: "Interest Income",
      merchant: "Cascade Community Bank",
      description: "CASCADE COMMUNITY BANK INTEREST PAID",
      amountRange: [4, 9],
      type: "income",
    },
    {
      key: "interest-cd",
      dayOfMonth: 28,
      accountId: ids.cd,
      categoryName: "Interest Income",
      merchant: "Meridian Investment Group",
      description: "MERIDIAN CD INTEREST PAID",
      amountRange: [33, 37],
      type: "income",
      startDate: ACCOUNT_CD_OPENING_DATE,
    },
  ];
}

export function buildRecurringTransactions(ownerId: string): TransactionDraft[] {
  const rng = createRng(RNG_SEED);
  const ids = accountIds(ownerId);
  const categoryId = categoryIdByName(ownerId);

  const monthly = monthlyStreams(ids).flatMap((stream) => buildMonthlyStream(ownerId, categoryId, stream, rng));

  const biweekly = buildBiweeklyStream(
    ownerId,
    categoryId,
    "payroll",
    ids.checking,
    "Salary",
    "Acme Corp",
    "ACME CORP PAYROLL",
    [2780, 2920],
    rng,
  );

  const quarterly = buildQuarterlyStream(
    ownerId,
    categoryId,
    "dividend",
    ids.brokerage,
    "Dividend Income",
    "Meridian Investment Group",
    "MERIDIAN BROKERAGE DIVIDEND",
    [180, 260],
    rng,
  );

  const ccInterest = buildOccasional(
    ownerId,
    categoryId,
    "cc-interest",
    ids.creditCard,
    "Credit Card Interest",
    "Harbor Trust Credit Union",
    "HARBOR TRUST FINANCE CHARGE",
    [15, 45],
    [1, 3, 6, 8, 10, 13, 15, 17],
    22,
    rng,
  );

  const bankFees = buildOccasional(
    ownerId,
    categoryId,
    "bank-fee",
    ids.checking,
    "Bank Fees",
    "Cascade Community Bank",
    "CASCADE COMMUNITY BANK SERVICE FEE",
    [5, 35],
    [2, 7, 11, 14, 16],
    27,
    rng,
  );

  // Freelance income is irregular by nature — every other month or so,
  // never on a suspiciously round day.
  const freelanceMonthOffsets = [0, 2, 4, 5, 7, 9, 11, 13, 16];
  const freelance = freelanceMonthOffsets
    .map((offset, index) => {
      const monthStart = addMonths(`${SEED_EARLIEST_TRANSACTION_DATE.slice(0, 8)}01`, offset);
      const date = clampDayOfMonth(monthStart, 22);
      if (compareDates(date, SEED_LATEST_TRANSACTION_DATE) > 0) return null;
      const row: TransactionDraft = {
        id: fixtureId(ownerId, `txn:recurring:freelance:${index}`),
        accountId: ids.checking,
        categoryId: categoryId["Freelance Income"],
        transactionDate: date,
        originalDescription: `FREELANCE INVOICE #${1040 + index}`,
        merchant: "Freelance Client",
        amount: rngAmount(rng, 300, 900),
        transactionType: "income",
      };
      return row;
    })
    .filter((row): row is TransactionDraft => row !== null);

  return [...monthly, ...biweekly, ...quarterly, ...ccInterest, ...bankFees, ...freelance];
}
