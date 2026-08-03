"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";
import { ChevronDown, Search } from "lucide-react";

import type { TransactionFilterOption } from "@/application/transactions/transactions-views";
import { TRANSACTION_TYPES, type TransactionType } from "@/domains/transactions/types";
import { DATE_RANGE_PRESETS, DATE_RANGE_PRESET_LABELS, type DateRangePreset } from "@/features/transactions/search-params";

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

// Native <select> with its default appearance hidden and a chevron
// re-drawn close to the label — the browser's own arrow always sits flush
// against the control's outer edge, which read as "disconnected" from the
// text at this control's width. The select still sizes to its own content
// (it isn't a flex-grow child), so this stays a tight "Label ⌄" pill
// rather than stretching to fill the row.
function FilterSelect({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative inline-flex items-center">
      <label className="sr-only" htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={onChange}
        className="appearance-none rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] py-2 pr-7 pl-3 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-[var(--foreground-muted)]"
        strokeWidth={2}
      />
    </div>
  );
}

export function TransactionsFilterBar({
  accountOptions,
  categoryOptions,
}: {
  accountOptions: TransactionFilterOption[];
  categoryOptions: TransactionFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParam = searchParams.get("search") ?? "";
  const [searchDraft, setSearchDraft] = useState(searchParam);
  const [syncedSearchParam, setSyncedSearchParam] = useState(searchParam);

  // Keeps the input in sync when "search" is cleared from somewhere other
  // than this form's own submit — e.g. a chip removed or "Clear all" in
  // the Filters Applied panel. useState only seeds once at mount, so
  // without this the box would keep showing stale text after an external
  // clear (same class of bug as the list staleness fixed earlier in this
  // feature — see page.tsx's key={JSON.stringify(filters)} comment).
  // Adjusted during render (React's recommended pattern for "reset state
  // when a prop changes") rather than in a useEffect, to avoid the extra
  // commit-then-effect render pass.
  if (searchParam !== syncedSearchParam) {
    setSyncedSearchParam(searchParam);
    setSearchDraft(searchParam);
  }

  function navigate(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    // Any filter change starts a new result set — a stale cursor from the
    // previous filters would silently skip or repeat rows.
    next.delete("cursor");
    router.push(`${pathname}?${next.toString()}`);
  }

  const rangeParam = searchParams.get("range");
  const datePreset: DateRangePreset = DATE_RANGE_PRESETS.includes(rangeParam as DateRangePreset)
    ? (rangeParam as DateRangePreset)
    : "this-month";
  const isCustomRange = datePreset === "custom";

  const accountId = searchParams.get("accountId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const transactionType = searchParams.get("transactionType") ?? "";

  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)] p-4 sm:flex-row sm:flex-wrap sm:items-center">
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          navigate({ search: searchDraft.trim() || null });
        }}
        className="relative flex-1 sm:min-w-[220px]"
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-[var(--foreground-muted)]"
          strokeWidth={1.75}
        />
        <label htmlFor="transactions-search" className="sr-only">
          Search transactions by description or merchant
        </label>
        <input
          id="transactions-search"
          type="search"
          value={searchDraft}
          onChange={(event) => setSearchDraft(event.target.value)}
          placeholder="Search description or merchant…"
          className="w-full rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] py-2 pr-3 pl-9 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--primary)] focus:outline-none"
        />
      </form>

      <FilterSelect
        id="transactions-account-filter"
        label="Filter by account"
        value={accountId}
        onChange={(event) => navigate({ accountId: event.target.value || null })}
      >
        <option value="">All Accounts</option>
        {accountOptions.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="transactions-category-filter"
        label="Filter by category"
        value={categoryId}
        onChange={(event) => navigate({ categoryId: event.target.value || null })}
      >
        <option value="">All Categories</option>
        {categoryOptions.map((category) => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="transactions-type-filter"
        label="Filter by type"
        value={transactionType}
        onChange={(event) => navigate({ transactionType: event.target.value || null })}
      >
        <option value="">All Types</option>
        {TRANSACTION_TYPES.map((type) => (
          <option key={type} value={type}>
            {TYPE_LABELS[type]}
          </option>
        ))}
      </FilterSelect>

      <FilterSelect
        id="transactions-date-range"
        label="Date range"
        value={datePreset}
        onChange={(event) => {
          const next = event.target.value as DateRangePreset;
          if (next === "custom") {
            navigate({ range: "custom" });
          } else {
            navigate({ range: next === "this-month" ? null : next, dateFrom: null, dateTo: null });
          }
        }}
      >
        {DATE_RANGE_PRESETS.map((preset) => (
          <option key={preset} value={preset}>
            Date: {DATE_RANGE_PRESET_LABELS[preset]}
          </option>
        ))}
      </FilterSelect>

      {isCustomRange && (
        <div className="flex items-center gap-2">
          <label htmlFor="transactions-date-from" className="sr-only">
            From date
          </label>
          <input
            id="transactions-date-from"
            type="date"
            value={searchParams.get("dateFrom") ?? ""}
            onChange={(event) => navigate({ dateFrom: event.target.value || null })}
            className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
          <span className="text-sm text-[var(--foreground-muted)]">to</span>
          <label htmlFor="transactions-date-to" className="sr-only">
            To date
          </label>
          <input
            id="transactions-date-to"
            type="date"
            value={searchParams.get("dateTo") ?? ""}
            onChange={(event) => navigate({ dateTo: event.target.value || null })}
            className="rounded-[calc(var(--radius)-8px)] border border-[var(--border)] bg-[var(--background)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--primary)] focus:outline-none"
          />
        </div>
      )}

      {/* TECH DEBT: there are no further filter dimensions to expose today
          (account/category/type/date/search is the complete set the
          backend supports) — shown disabled rather than omitted so the
          control row's hierarchy matches the approved mockup. */}
      <button
        type="button"
        disabled
        title="No additional filters are available yet"
        className="ml-auto flex cursor-not-allowed items-center gap-1.5 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-3 py-2 text-sm font-medium text-[var(--foreground-muted)] opacity-70"
      >
        More Filters
      </button>
    </div>
  );
}
