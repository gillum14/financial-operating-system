"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownLeft, ArrowLeftRight, ArrowUp, ArrowUpRight, type LucideIcon } from "lucide-react";

import type { TransactionListItem } from "@/application/transactions/transactions-views";
import type { TransactionType } from "@/domains/transactions/types";

import { categoryTone } from "../category-color";
import { formatSignedAmount, formatTransactionDate } from "../format";

const TYPE_ICON: Record<TransactionType, LucideIcon> = {
  income: ArrowUpRight,
  expense: ArrowDownLeft,
  transfer: ArrowLeftRight,
};

const TYPE_LABEL: Record<TransactionType, string> = {
  income: "Income",
  expense: "Expense",
  transfer: "Transfer",
};

const TYPE_TONE: Record<TransactionType, string> = {
  income: "text-[var(--success)]",
  expense: "text-[var(--foreground)]",
  transfer: "text-[var(--foreground-secondary)]",
};

function CategoryPill({ name }: { name: string | null }) {
  if (!name) {
    return <span className="text-sm text-[var(--foreground-muted)]">Uncategorized</span>;
  }
  const tone = categoryTone(name);
  return (
    <span
      className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ backgroundColor: `color-mix(in srgb, ${tone} 16%, transparent)`, color: tone }}
    >
      {name}
    </span>
  );
}

export function TransactionsTable({
  items,
  onSelect,
}: {
  items: TransactionListItem[];
  onSelect: (item: TransactionListItem) => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const sort = searchParams.get("sort") === "asc" ? "asc" : "desc";

  function toggleSort() {
    const next = new URLSearchParams(searchParams.toString());
    if (sort === "desc") {
      next.set("sort", "asc");
    } else {
      next.delete("sort");
    }
    next.delete("cursor");
    router.push(`${pathname}?${next.toString()}`);
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[var(--surface)] px-6 py-16 text-center">
        <p className="text-base font-semibold text-[var(--foreground)]">No transactions found</p>
        <p className="mt-1 text-sm text-[var(--foreground-muted)]">
          Try widening your date range or clearing a filter.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-[var(--radius)] border border-[var(--border)] bg-[var(--surface)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] text-left text-xs font-semibold tracking-[0.06em] text-[var(--foreground-muted)] uppercase">
              <th className="px-6 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Description</th>
              <th className="px-4 py-3 font-semibold">Account</th>
              <th className="px-4 py-3 font-semibold">Category</th>
              <th className="px-4 py-3 font-semibold">
                <button
                  type="button"
                  onClick={toggleSort}
                  className="inline-flex items-center gap-1 uppercase tracking-[0.06em] hover:text-[var(--foreground)]"
                  aria-label={`Sort by date, currently ${sort === "desc" ? "newest first" : "oldest first"}`}
                >
                  Date
                  <ArrowUp className={`h-3 w-3 transition-transform ${sort === "desc" ? "rotate-180" : ""}`} strokeWidth={2} />
                </button>
              </th>
              <th className="px-6 py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const Icon = TYPE_ICON[item.transaction.transactionType];
              const displayName = item.transaction.merchant ?? item.transaction.originalDescription;

              return (
                <tr key={item.transaction.id} className="border-b border-[var(--border-subtle)] last:border-b-0">
                  <td className="px-6 py-3">
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-hover)] ${TYPE_TONE[item.transaction.transactionType]}`}
                      title={TYPE_LABEL[item.transaction.transactionType]}
                    >
                      <Icon className="h-4 w-4" strokeWidth={1.75} />
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => onSelect(item)}
                      className="block w-full min-w-0 rounded-[calc(var(--radius)-8px)] text-left outline-none hover:bg-[var(--surface-hover)] focus-visible:bg-[var(--surface-hover)]"
                    >
                      <span className="block truncate font-medium text-[var(--foreground)]">{displayName}</span>
                      {item.transaction.isExcluded && (
                        <span className="block text-xs text-[var(--foreground-muted)]">Excluded from totals</span>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-secondary)]">
                    <span className="block">{item.accountName}</span>
                    {item.accountMaskedNumber && (
                      <span className="block text-xs text-[var(--foreground-muted)]">{item.accountMaskedNumber}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <CategoryPill name={item.categoryName} />
                  </td>
                  <td className="px-4 py-3 text-[var(--foreground-secondary)]">
                    {formatTransactionDate(item.transaction.transactionDate)}
                  </td>
                  <td className={`px-6 py-3 text-right font-medium ${TYPE_TONE[item.transaction.transactionType]}`}>
                    {formatSignedAmount(Number(item.transaction.amount))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
