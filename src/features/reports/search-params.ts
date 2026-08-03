import { computePresetRange, DATE_RANGE_PRESETS, type DateRangePreset } from "@/features/transactions/search-params";

export { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS, type DateRangePreset } from "@/features/transactions/search-params";

export type ReportsSearchParams = Record<string, string | string[] | undefined>;

function getParam(raw: ReportsSearchParams, key: string): string | undefined {
  const value = raw[key];
  const single = Array.isArray(value) ? value[0] : value;
  return single && single.length > 0 ? single : undefined;
}

// Reuses Transactions' exact date-preset math (computePresetRange) rather
// than a second implementation of "what does 'Last 3 Months' mean" — same
// reasoning as reusing its income/expense aggregation in
// spending-aggregation.ts. Custom range isn't offered here (no date
// inputs in the Reports period selector, per the approved mockup), so
// unlike Transactions' parser this never reads raw dateFrom/dateTo params.
export function parseReportsSearchParams(raw: ReportsSearchParams): { datePreset: DateRangePreset; dateFrom?: string; dateTo?: string } {
  const presetParam = getParam(raw, "range");
  const datePreset: DateRangePreset = DATE_RANGE_PRESETS.includes(presetParam as DateRangePreset)
    ? (presetParam as DateRangePreset)
    : "this-month";

  const { dateFrom, dateTo } = computePresetRange(datePreset);
  return { datePreset, dateFrom, dateTo };
}
