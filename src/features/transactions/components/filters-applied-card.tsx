"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import type { TransactionFilterOption } from "@/application/transactions/transactions-views";
import { TRANSACTION_TYPES, type TransactionType } from "@/domains/transactions/types";
import { DATE_RANGE_PRESET_LABELS, DATE_RANGE_PRESETS, type DateRangePreset } from "@/features/transactions/search-params";

import { RailCard } from "./rail-card";

const TYPE_LABELS: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

export function FiltersAppliedCard({
  accountOptions,
  categoryOptions,
}: {
  accountOptions: TransactionFilterOption[];
  categoryOptions: TransactionFilterOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function navigate(updates: Record<string, string | null>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
    }
    next.delete("cursor");
    router.push(`${pathname}?${next.toString()}`);
  }

  const search = searchParams.get("search") ?? "";
  const accountId = searchParams.get("accountId") ?? "";
  const categoryId = searchParams.get("categoryId") ?? "";
  const transactionType = searchParams.get("transactionType") ?? "";
  const rangeParam = searchParams.get("range");
  const datePreset: DateRangePreset = DATE_RANGE_PRESETS.includes(rangeParam as DateRangePreset)
    ? (rangeParam as DateRangePreset)
    : "this-month";

  const chips: { key: string; label: string; onRemove?: () => void }[] = [];
  if (search) {
    chips.push({ key: "search", label: `"${search}"`, onRemove: () => navigate({ search: null }) });
  }
  const accountLabel = accountOptions.find((account) => account.id === accountId)?.name;
  if (accountId && accountLabel) {
    chips.push({ key: "accountId", label: accountLabel, onRemove: () => navigate({ accountId: null }) });
  }
  const categoryLabel = categoryOptions.find((category) => category.id === categoryId)?.name;
  if (categoryId && categoryLabel) {
    chips.push({ key: "categoryId", label: categoryLabel, onRemove: () => navigate({ categoryId: null }) });
  }
  if (transactionType && TRANSACTION_TYPES.includes(transactionType as TransactionType)) {
    chips.push({
      key: "transactionType",
      label: TYPE_LABELS[transactionType as TransactionType],
      onRemove: () => navigate({ transactionType: null }),
    });
  }
  // The date scope is always shown, even at the "This Month" default,
  // since it's always in effect — but the default isn't a removable
  // choice the way the others are, so it gets no remove affordance.
  chips.push({
    key: "range",
    label: `Date: ${DATE_RANGE_PRESET_LABELS[datePreset]}`,
    onRemove: datePreset === "this-month" ? undefined : () => navigate({ range: null, dateFrom: null, dateTo: null }),
  });

  function clearAll() {
    router.push(pathname);
  }

  // Clear All appears whenever anything is actually removable — a
  // non-default date preset counts even with no other filter active, not
  // just a non-date filter (the previous version under-triggered here).
  const hasRemovableFilter = chips.some((chip) => chip.onRemove);

  return (
    <RailCard
      title="Filters Applied"
      action={
        hasRemovableFilter && (
          <button type="button" onClick={clearAll} className="text-xs font-medium text-[var(--primary)] hover:underline">
            Clear all
          </button>
        )
      }
    >
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={chip.key}
            className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border)] bg-[var(--background)] py-1 pr-2 pl-2.5 text-xs font-medium text-[var(--foreground-secondary)]"
          >
            {chip.label}
            {chip.onRemove && (
              <button
                type="button"
                onClick={chip.onRemove}
                aria-label={`Remove filter: ${chip.label}`}
                className="rounded-full hover:text-[var(--foreground)]"
              >
                <X className="h-3 w-3" strokeWidth={2} />
              </button>
            )}
          </span>
        ))}
      </div>
    </RailCard>
  );
}
