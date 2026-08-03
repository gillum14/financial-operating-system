import type { TransactionsQueryParams } from "@/application/transactions/transactions-views";
import { TRANSACTION_TYPES, type TransactionType } from "@/domains/transactions/types";

export type TransactionsSearchParams = Record<string, string | string[] | undefined>;

export const DATE_RANGE_PRESETS = ["this-month", "last-month", "last-3-months", "this-year", "all", "custom"] as const;
export type DateRangePreset = (typeof DATE_RANGE_PRESETS)[number];

export const DATE_RANGE_PRESET_LABELS: Record<DateRangePreset, string> = {
  "this-month": "This Month",
  "last-month": "Last Month",
  "last-3-months": "Last 3 Months",
  "this-year": "This Year",
  all: "All Time",
  custom: "Custom Range",
};

function getParam(raw: TransactionsSearchParams, key: string): string | undefined {
  const value = raw[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length > 0 ? single : undefined;
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthRange(year: number, month: number): { dateFrom: string; dateTo: string } {
  return {
    dateFrom: toDateString(new Date(Date.UTC(year, month, 1))),
    dateTo: toDateString(new Date(Date.UTC(year, month + 1, 0))),
  };
}

// The one place date-preset math happens — the filter bar only ever sends
// a preset *key* (or an explicit custom dateFrom/dateTo), never computed
// dates, so there's a single source of truth for what "Last 3 Months"
// actually means.
export function computePresetRange(preset: DateRangePreset): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();

  switch (preset) {
    case "this-month":
      return monthRange(year, month);
    case "last-month":
      return monthRange(year, month - 1);
    case "last-3-months":
      return { dateFrom: monthRange(year, month - 2).dateFrom, dateTo: monthRange(year, month).dateTo };
    case "this-year":
      return { dateFrom: toDateString(new Date(Date.UTC(year, 0, 1))), dateTo: toDateString(new Date(Date.UTC(year, 11, 31))) };
    case "all":
      return {};
    case "custom":
      return {};
  }
}

// Bounds the default view to the current calendar month — without this,
// a first-time page load (and the unbounded income/expense summary query
// behind it, see transactions-query.ts) would scan a user's entire
// transaction history by default. Every preset other than "custom" has
// its date bounds computed here, server-side, from the preset key alone —
// the client never sends computed dates for a named preset, only the key.
export function parseTransactionsSearchParams(raw: TransactionsSearchParams): TransactionsQueryParams & {
  datePreset: DateRangePreset;
} {
  const presetParam = getParam(raw, "range");
  const datePreset: DateRangePreset = DATE_RANGE_PRESETS.includes(presetParam as DateRangePreset)
    ? (presetParam as DateRangePreset)
    : "this-month";

  const { dateFrom, dateTo } =
    datePreset === "custom"
      ? { dateFrom: getParam(raw, "dateFrom"), dateTo: getParam(raw, "dateTo") }
      : computePresetRange(datePreset);

  const transactionTypeParam = getParam(raw, "transactionType");
  const transactionType = TRANSACTION_TYPES.includes(transactionTypeParam as TransactionType)
    ? (transactionTypeParam as TransactionType)
    : undefined;

  const sortParam = getParam(raw, "sort");
  const sort = sortParam === "asc" ? "asc" : undefined;

  return {
    accountId: getParam(raw, "accountId"),
    categoryId: getParam(raw, "categoryId"),
    transactionType,
    dateFrom,
    dateTo,
    search: getParam(raw, "search"),
    cursor: getParam(raw, "cursor"),
    sort,
    datePreset,
  };
}
