import { createRng, fixtureId, iterateDeterministicDates, rngAmount, rngPick } from "../../deterministic";
import { accountIds, type AccountIds } from "../accounts";
import { categoryIdByName } from "../categories";
import { SEED_EARLIEST_TRANSACTION_DATE, SEED_LATEST_TRANSACTION_DATE } from "../window";
import type { TransactionDraft } from "./types";

// The irregular half of the dataset: frequent, variable-amount spending
// with realistic (not metronomic) spacing — see
// deterministic.ts#iterateDeterministicDates. Every stream below reuses
// the exact same window (SEED_EARLIEST_TRANSACTION_DATE..
// SEED_LATEST_TRANSACTION_DATE) as recurring.ts, so account history and
// transaction dates never disagree about when "the sandbox" begins.
const RNG_SEED = 0x564152; // "VAR" — arbitrary, fixed, never changes.

interface VariableStream {
  key: string;
  accountId: string;
  categoryName: string;
  merchants: string[];
  amountRange: [number, number];
  avgIntervalDays: number;
  jitterDays: number;
}

function buildVariableStream(
  ownerId: string,
  categoryId: Record<string, string>,
  stream: VariableStream,
  rng: () => number,
): TransactionDraft[] {
  const dates = iterateDeterministicDates(
    SEED_EARLIEST_TRANSACTION_DATE,
    SEED_LATEST_TRANSACTION_DATE,
    stream.avgIntervalDays,
    stream.jitterDays,
    rng,
  );

  return dates.map((date, index) => {
    const merchant = rngPick(rng, stream.merchants);
    const amount = rngAmount(rng, stream.amountRange[0], stream.amountRange[1]);
    return {
      id: fixtureId(ownerId, `txn:variable:${stream.key}:${index}`),
      accountId: stream.accountId,
      categoryId: categoryId[stream.categoryName],
      transactionDate: date,
      originalDescription: merchant.toUpperCase(),
      merchant,
      amount: `-${amount}`,
      transactionType: "expense",
    };
  });
}

const GROCERY_MERCHANTS = ["Greenfield Market", "Cascade Foods Co-op", "Northgate Grocery"];
const RESTAURANT_MERCHANTS = ["Harbor View Bistro", "Riverside Grill", "Maple & Vine Kitchen", "Golden Wok"];
const COFFEE_MERCHANTS = ["Corner Coffee Co", "Steamhouse Coffee", "Daily Grind Café"];
const FUEL_MERCHANTS = ["Summit Fuel Station", "Cascade Gas & Go"];

function variableStreams(ids: AccountIds): VariableStream[] {
  return [
    {
      key: "groceries",
      accountId: ids.checking,
      categoryName: "Groceries",
      merchants: GROCERY_MERCHANTS,
      amountRange: [45, 145],
      avgIntervalDays: 4,
      jitterDays: 1,
    },
    {
      key: "restaurants",
      accountId: ids.creditCard,
      categoryName: "Restaurants",
      merchants: RESTAURANT_MERCHANTS,
      amountRange: [18, 88],
      avgIntervalDays: 5,
      jitterDays: 2,
    },
    {
      key: "coffee",
      accountId: ids.creditCard,
      categoryName: "Coffee Shops",
      merchants: COFFEE_MERCHANTS,
      amountRange: [4, 9],
      avgIntervalDays: 4,
      jitterDays: 1,
    },
    {
      key: "fuel",
      accountId: ids.cashbackCreditCard,
      categoryName: "Fuel",
      merchants: FUEL_MERCHANTS,
      amountRange: [35, 72],
      avgIntervalDays: 7,
      jitterDays: 2,
    },
    {
      key: "auto-maintenance",
      accountId: ids.cashbackCreditCard,
      categoryName: "Auto Maintenance",
      merchants: ["Summit Auto Service", "Cascade Tire & Lube"],
      amountRange: [60, 450],
      avgIntervalDays: 62,
      jitterDays: 18,
    },
    {
      key: "pharmacy",
      accountId: ids.checking,
      categoryName: "Pharmacy",
      merchants: ["Northgate Pharmacy", "Cascade Drug Mart"],
      amountRange: [12, 62],
      avgIntervalDays: 30,
      jitterDays: 8,
    },
    {
      key: "doctor-visits",
      accountId: ids.checking,
      categoryName: "Doctor Visits",
      merchants: ["Summit Family Medicine", "Riverside Pediatrics"],
      amountRange: [25, 150],
      avgIntervalDays: 58,
      jitterDays: 15,
    },
    {
      key: "dental",
      accountId: ids.checking,
      categoryName: "Dental",
      merchants: ["Cascade Dental Group"],
      amountRange: [80, 320],
      avgIntervalDays: 178,
      jitterDays: 20,
    },
    {
      key: "clothing",
      accountId: ids.cashbackCreditCard,
      categoryName: "Clothing",
      merchants: ["Northgate Outfitters", "Maple Street Apparel"],
      amountRange: [30, 140],
      avgIntervalDays: 26,
      jitterDays: 10,
    },
    {
      key: "electronics",
      accountId: ids.cashbackCreditCard,
      categoryName: "Electronics",
      merchants: ["Circuit & Sound Electronics", "Cascade Tech Outlet"],
      amountRange: [40, 350],
      avgIntervalDays: 56,
      jitterDays: 20,
    },
    {
      key: "gifts",
      accountId: ids.creditCard,
      categoryName: "Gifts",
      merchants: ["Riverside Gift Shop", "Maple & Vine Boutique"],
      amountRange: [20, 120],
      avgIntervalDays: 40,
      jitterDays: 15,
    },
    {
      key: "legal-tax",
      accountId: ids.checking,
      categoryName: "Legal & Tax",
      merchants: ["Harbor Legal Services", "Northgate Tax Preparation"],
      amountRange: [150, 600],
      avgIntervalDays: 200,
      jitterDays: 25,
    },
  ];
}

// Fixed points, not a recurring stream — three trips across the 18-month
// window (roughly months 3, 9, and 15 of the window), each a flight +
// lodging charge on the primary credit card.
const TRAVEL_TRIPS: { monthOffset: number; day: number; flight: number; lodging: number }[] = [
  { monthOffset: 3, day: 12, flight: 1, lodging: 1 },
  { monthOffset: 9, day: 18, flight: 2, lodging: 2 },
  { monthOffset: 15, day: 6, flight: 3, lodging: 3 },
];

function buildTravel(ownerId: string, categoryId: Record<string, string>, ids: AccountIds, rng: () => number): TransactionDraft[] {
  return TRAVEL_TRIPS.flatMap((trip) => {
    const monthStart = `${SEED_EARLIEST_TRANSACTION_DATE.slice(0, 8)}01`;
    const date = new Date(`${monthStart}T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + trip.monthOffset);
    date.setUTCDate(trip.day);
    const isoDate = date.toISOString().slice(0, 10);

    const flight: TransactionDraft = {
      id: fixtureId(ownerId, `txn:variable:travel-flight:${trip.flight}`),
      accountId: ids.creditCard,
      categoryId: categoryId.Flights,
      transactionDate: isoDate,
      originalDescription: "SUMMIT AIRWAYS",
      merchant: "Summit Airways",
      amount: `-${rngAmount(rng, 380, 780)}`,
      transactionType: "expense",
    };
    const lodging: TransactionDraft = {
      id: fixtureId(ownerId, `txn:variable:travel-lodging:${trip.lodging}`),
      accountId: ids.creditCard,
      categoryId: categoryId.Lodging,
      transactionDate: isoDate,
      originalDescription: "RIVERSTONE INN & SUITES",
      merchant: "Riverstone Inn & Suites",
      amount: `-${rngAmount(rng, 420, 890)}`,
      transactionType: "expense",
    };
    return [flight, lodging];
  });
}

interface RefundStream {
  key: string;
  accountId: string;
  categoryName: string;
  merchant: string;
  amountRange: [number, number];
}

function refundStreams(ids: AccountIds): RefundStream[] {
  return [
    { key: "clothing", accountId: ids.cashbackCreditCard, categoryName: "Clothing", merchant: "Northgate Outfitters", amountRange: [20, 60] },
    { key: "electronics", accountId: ids.cashbackCreditCard, categoryName: "Electronics", merchant: "Circuit & Sound Electronics", amountRange: [30, 120] },
    { key: "restaurant", accountId: ids.creditCard, categoryName: "Restaurants", merchant: "Golden Wok", amountRange: [10, 40] },
  ];
}

function buildRefunds(
  ownerId: string,
  categoryId: Record<string, string>,
  ids: AccountIds,
  rng: () => number,
): TransactionDraft[] {
  const dates = iterateDeterministicDates(SEED_EARLIEST_TRANSACTION_DATE, SEED_LATEST_TRANSACTION_DATE, 47, 12, rng);
  const streams = refundStreams(ids);
  return dates.map((date, index) => {
    const stream = rngPick(rng, streams);
    return {
      id: fixtureId(ownerId, `txn:variable:refund:${index}`),
      accountId: stream.accountId,
      categoryId: categoryId[stream.categoryName],
      transactionDate: date,
      originalDescription: `${stream.merchant.toUpperCase()} REFUND`,
      merchant: stream.merchant,
      amount: rngAmount(rng, stream.amountRange[0], stream.amountRange[1]),
      transactionType: "income",
    };
  });
}

export function buildVariableSpendingTransactions(ownerId: string): TransactionDraft[] {
  const rng = createRng(RNG_SEED);
  const ids = accountIds(ownerId);
  const categoryId = categoryIdByName(ownerId);
  const streamTransactions = variableStreams(ids).flatMap((stream) => buildVariableStream(ownerId, categoryId, stream, rng));
  return [...streamTransactions, ...buildTravel(ownerId, categoryId, ids, rng), ...buildRefunds(ownerId, categoryId, ids, rng)];
}
