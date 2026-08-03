// Shared grid-template-columns class for pages with a main workspace and a
// narrow right utility rail (Transactions, Budgets, Goals) — one constant
// so their column widths and breakpoint threshold can never drift apart,
// whether between pages or between a page's own full-width row (e.g. a
// metrics strip) and its two-column section below it.
export const RAIL_GRID_COLS = "grid gap-6 min-[1360px]:grid-cols-[minmax(0,1fr)_21rem]";
