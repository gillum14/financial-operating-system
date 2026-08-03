"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";

import { DATE_RANGE_PRESET_LABELS, DATE_RANGE_PRESETS, type DateRangePreset } from "@/features/reports/search-params";

// Reuses Transactions' preset vocabulary (This Month/Last Month/Last 3
// Months/This Year/All Time) rather than inventing a literal-date-range
// button label ("July 1 – July 31, 2026") — one consistent period-picker
// UX across the app instead of a one-off for this page. No "Custom Range"
// option: there's no date-input UI behind it here.
const SELECTABLE_PRESETS: DateRangePreset[] = DATE_RANGE_PRESETS.filter((preset) => preset !== "custom");

export function ReportsPeriodSelector() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeParam = searchParams.get("range");
  const datePreset: DateRangePreset = SELECTABLE_PRESETS.includes(rangeParam as DateRangePreset)
    ? (rangeParam as DateRangePreset)
    : "this-month";

  function onChange(event: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(searchParams.toString());
    const value = event.target.value;
    if (value === "this-month") {
      next.delete("range");
    } else {
      next.set("range", value);
    }
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="relative inline-flex items-center">
      <label className="sr-only" htmlFor="reports-period">
        Report period
      </label>
      <select
        id="reports-period"
        value={datePreset}
        onChange={onChange}
        className="appearance-none rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] py-2 pr-7 pl-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
      >
        {SELECTABLE_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            {DATE_RANGE_PRESET_LABELS[preset]}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[var(--foreground-muted)]"
        strokeWidth={2}
      />
    </div>
  );
}
