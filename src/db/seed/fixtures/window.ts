import { addDays, addMonths } from "../deterministic";

// The sandbox's fixed "as of" anchor — chosen once, when this dataset was
// built (2026-08-06), and never derived from `new Date()`. All 18 months
// of seeded transaction history count backward from this fixed point, so
// re-running the seed script next year produces the exact same dates it
// produces today. This is a deliberate, permanent trade-off: a fixed-id,
// idempotent dataset cannot also track "today" without breaking
// idempotency (a rerun's onConflictDoNothing means dates from the first
// run stick forever regardless of what "today" is on later runs) — see
// docs/development-seed-baseline.md.
//
// A few days before the anchor (not the anchor itself) so the most recent
// activity reads like a real bank feed that's mostly, not perfectly,
// caught up.
export const SEED_LATEST_TRANSACTION_DATE = addDays("2026-08-06", -2);

// 18 months of history, inclusive of the latest date above.
export const SEED_WINDOW_MONTHS = 18;
export const SEED_EARLIEST_TRANSACTION_DATE = addMonths(SEED_LATEST_TRANSACTION_DATE, -SEED_WINDOW_MONTHS);

// Every account used by the recurring/variable generators opens before
// this — well before the transaction window starts — except the CD,
// which deliberately opens mid-window (see fixtures/accounts.ts) to
// exercise "transactions must align with account history."
export const SEED_LONG_STANDING_ACCOUNT_OPENING_DATE = addMonths(SEED_EARLIEST_TRANSACTION_DATE, -30);
