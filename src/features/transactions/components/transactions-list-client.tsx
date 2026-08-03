"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import type {
  TransactionFilterOption,
  TransactionListItem,
  TransactionsQueryParams,
} from "@/application/transactions/transactions-views";
import { loadMoreTransactions } from "@/features/transactions/actions";
import { useServerAction } from "@/lib/actions/use-action";

import { EditTransactionDialog } from "./edit-transaction-dialog";
import { TransactionsTable } from "./transactions-table";

function useRelativeFreshness(since: Date): string {
  const [label, setLabel] = useState("Updated just now");

  useEffect(() => {
    function tick() {
      const seconds = Math.floor((Date.now() - since.getTime()) / 1000);
      if (seconds < 30) {
        setLabel("Updated just now");
      } else if (seconds < 60) {
        setLabel("Updated less than a minute ago");
      } else {
        const minutes = Math.floor(seconds / 60);
        setLabel(`Updated ${minutes} minute${minutes === 1 ? "" : "s"} ago`);
      }
    }
    tick();
    const interval = setInterval(tick, 30_000);
    return () => clearInterval(interval);
  }, [since]);

  return label;
}

export function TransactionsListClient({
  initialItems,
  initialHasMore,
  initialCursor,
  totalCount,
  filters,
  categoryOptions,
}: {
  initialItems: TransactionListItem[];
  initialHasMore: boolean;
  initialCursor: string | null;
  totalCount: number;
  filters: TransactionsQueryParams;
  categoryOptions: TransactionFilterOption[];
}) {
  const [items, setItems] = useState(initialItems);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [cursor, setCursor] = useState(initialCursor);
  const [selected, setSelected] = useState<TransactionListItem | null>(null);
  const [loadedAt] = useState(() => new Date());
  const freshness = useRelativeFreshness(loadedAt);
  const loadMore = useServerAction(loadMoreTransactions);

  function handleLoadMore() {
    if (!cursor) return;
    loadMore.run({ ...filters, cursor }, (view) => {
      setItems((current) => [...current, ...view.items]);
      setHasMore(view.hasMore);
      setCursor(view.nextCursor);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-[var(--foreground-secondary)]">
          {totalCount.toLocaleString()} {totalCount === 1 ? "transaction" : "transactions"}
        </p>
        <p className="text-xs text-[var(--foreground-muted)]">{freshness}</p>
      </div>

      <TransactionsTable items={items} onSelect={setSelected} />

      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadMore.isPending}
            className="flex items-center gap-2 rounded-[calc(var(--radius)-8px)] border border-[var(--border)] px-4 py-2.5 text-sm font-medium text-[var(--foreground-secondary)] transition-colors hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loadMore.isPending && <Loader2 className="h-4 w-4 animate-spin" strokeWidth={2} />}
            {loadMore.isPending ? "Loading…" : "Load more"}
          </button>
        </div>
      )}

      {loadMore.error && (
        <p role="alert" className="text-center text-sm text-[var(--danger)]">
          {loadMore.error.message}
        </p>
      )}

      <EditTransactionDialog item={selected} categoryOptions={categoryOptions} onClose={() => setSelected(null)} />
    </div>
  );
}
