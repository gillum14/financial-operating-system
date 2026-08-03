import {
  getTransactionsListView,
  type TransactionsListView,
} from "@/composition/transactions-query";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";
import { FiltersAppliedCard } from "@/features/transactions/components/filters-applied-card";
import { NeedToCategorizeCard } from "@/features/transactions/components/need-to-categorize-card";
import { SpendingSummaryCard } from "@/features/transactions/components/spending-summary-card";
import { TransactionsFilterBar } from "@/features/transactions/components/transactions-filter-bar";
import { TransactionsHeader } from "@/features/transactions/components/transactions-header";
import { TransactionsListClient } from "@/features/transactions/components/transactions-list-client";
import { UpcomingTransactionsCard } from "@/features/transactions/components/upcoming-transactions-card";
import {
  DATE_RANGE_PRESET_LABELS,
  parseTransactionsSearchParams,
  type TransactionsSearchParams,
} from "@/features/transactions/search-params";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Dashboard/Accounts).
export const dynamic = "force-dynamic";

// The rail's 4 cards, rendered once per breakpoint mode (desktop `aside`,
// stacked-below-2xl block) below — kept as one function so the two render
// sites can't drift out of sync with each other.
function RailCards({ view, periodLabel }: { view: TransactionsListView; periodLabel: string }) {
  return (
    <>
      <SpendingSummaryCard
        categoryBreakdown={view.categoryBreakdown}
        totalSpend={view.summary.expenses}
        periodLabel={periodLabel}
      />
      <UpcomingTransactionsCard />
      <FiltersAppliedCard
        accountOptions={view.accountOptions}
        categoryOptions={view.categoryOptions}
      />
      <NeedToCategorizeCard />
    </>
  );
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: Promise<TransactionsSearchParams>;
}) {
  const authUser = await requireAuthenticatedUser();
  const rawParams = await searchParams;
  const { datePreset, ...filters } = parseTransactionsSearchParams(rawParams);

  const view = await getTransactionsListView(authUser.id, filters);
  const periodLabel = DATE_RANGE_PRESET_LABELS[datePreset];

  return (
    // overflow-x-hidden (not just min-w-0) is required here: min-w-0 alone
    // stops flexbox from forcing this page's box wider, but it doesn't
    // *clip* already-overflowing content — a block-level descendant with
    // an intrinsic min-width (the transactions table's min-w-[760px], see
    // TransactionsTable) still visually bleeds past its ancestors' boxes
    // and inflates document.body.scrollWidth, dragging the whole page
    // (including the sidebar) into horizontal scroll on narrow viewports,
    // even though the table's own overflow-x-auto wrapper is present.
    // overflow-x-hidden here is the actual clipping boundary; the table's
    // own overflow-x-auto still provides real horizontal scrolling for
    // the table specifically, contained within this boundary. Confirmed
    // live at a 390px viewport: 624px document scroll width before this
    // fix, 390px after.
    <div className="min-w-0 space-y-6 overflow-x-hidden">
      <TransactionsHeader />

      <TransactionsFilterBar
        accountOptions={view.accountOptions}
        categoryOptions={view.categoryOptions}
      />

      {/* Desktop content grid: main transaction column + a narrow utility
          rail as a true grid sibling, not a stack that only happens to
          collapse. Held off until 2xl — the transactions table has six
          columns (vs. Account Detail's three), so splitting at the xl
          breakpoint left the list column narrower than the table's
          min-w-[760px] on an ordinary 1440px laptop screen, forcing a
          hidden horizontal scroll even though there was no visible
          indication of it. The rail is a FIXED 20rem, not a fractional
          column — at ultra-wide viewports a 1fr-based split would let it
          balloon toward half the page, which the mockup's narrow utility
          rail never does. */}
      <div className="grid items-start gap-6 min-[1360px]:grid-cols-[minmax(0,1fr)_21rem]">
        {/* A <div>, not a second <main>: the (authenticated) layout already
            renders the page's one <main> landmark around {children} —
            nesting another <main> inside it is invalid HTML (only one
            <main> per document) and was quietly grabbing the wrong element
            in DOM queries during verification. This is still the grid's
            main-column sibling of <aside> below; the landmark role just
            isn't re-declared here. */}
        <div className="min-w-0 space-y-4">
          {/* Results header, table/empty-state, and Load More pagination
              are one client island (TransactionsListClient) because they
              share client-owned state: items/hasMore/cursor from
              pagination, and the "Updated Xs ago" freshness clock both
              live there. Splitting the results header into a separate
              component would mean lifting that state up with no benefit —
              the DOM order inside this column is still
              [results header, table, pagination]. */}
          <TransactionsListClient
            // Keyed by the filter identity (not cursor — that's client-owned
            // pagination state, never a URL param): TransactionsListClient
            // seeds its items/hasMore/cursor state from props only once, at
            // mount. Without this key, a filter change re-renders the parent
            // Server Component with fresh `view` data, but the already-mounted
            // client component keeps showing its stale initial state — the
            // classic React "derived state from props" pitfall. Changing the
            // key forces a clean remount instead.
            key={JSON.stringify(filters)}
            initialItems={view.items}
            initialHasMore={view.hasMore}
            initialCursor={view.nextCursor}
            totalCount={view.totalCount}
            filters={filters}
            categoryOptions={view.categoryOptions}
          />
        </div>

        {/* True grid sibling of the list column above, visible only at
            2xl+ — this is what makes the rail sit beside the table rather
            than below it. */}
        <aside className="hidden space-y-4 min-[1360px]:block">
          <RailCards view={view} periodLabel={periodLabel} />
        </aside>
      </div>

      {/* Below 2xl the grid above collapses to one column and <aside> is
          hidden — this is the stacked-below-the-table rendering of the
          same 4 cards, shown only at those narrower widths. */}
      <div className="space-y-4 min-[1360px]:hidden">
        <RailCards view={view} periodLabel={periodLabel} />
      </div>
    </div>
  );
}
