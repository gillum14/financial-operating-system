// Shared grid-template-columns class for the Budgets page's two-column
// split — used by both the full-width metrics row (so its Overall
// Progress tile lines up with the rail below) and the main workspace/rail
// grid. Defined once, not duplicated, because that column-boundary
// alignment is the entire point: if the two usages ever drifted apart,
// the page would look "uneven" again.
export const BUDGETS_GRID_COLS = "grid gap-6 min-[1360px]:grid-cols-[minmax(0,1fr)_21rem]";
