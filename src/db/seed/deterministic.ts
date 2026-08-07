import { createHash } from "node:crypto";

// Every deterministic-id/value helper the seed fixtures share. Nothing
// here reads the wall clock, environment randomness, or any other
// non-reproducible input — the same inputs always produce the same
// outputs, on any machine, on any run, forever. That's what makes the
// sandbox dataset safe to regenerate idempotently (see seed/index.ts's
// onConflictDoNothing) and safe to reason about in tests without a
// database.

// A fixed, made-up namespace UUID for this app's deterministic ids —
// there's nothing significant about this value beyond "it never changes."
// Standard UUID v5 namespaces (DNS, URL, etc.) don't apply to us; this is
// our own.
const ATHENA_SEED_NAMESPACE = "6f6d2e2a-6e21-4f0a-9d2a-3a9b2c8f4e10";

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToUuid(bytes: Uint8Array): string {
  const hex = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return [hex.slice(0, 8), hex.slice(8, 12), hex.slice(12, 16), hex.slice(16, 20), hex.slice(20, 32)].join("-");
}

// RFC 4122 UUID v5 (SHA-1, namespace + name) — the standard algorithm for
// "the same name always produces the same UUID." Used instead of a
// hand-maintained list of literal UUIDs so hundreds of transaction fixtures
// can each get a stable, collision-resistant id from a short, readable
// key (e.g. "txn:checking:payroll:2025-03-14") instead of 1000+ typed
// literals.
export function deterministicId(name: string): string {
  const namespaceBytes = hexToBytes(ATHENA_SEED_NAMESPACE.replace(/-/g, ""));
  const nameBytes = new TextEncoder().encode(name);
  const hash = createHash("sha1")
    .update(namespaceBytes)
    .update(nameBytes)
    .digest();

  const bytes = new Uint8Array(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50; // version 5
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  return bytesToUuid(bytes);
}

// The very first sandbox owner — every row it already has in the database
// (the three pre-session literal ids plus everything the sandbox expansion
// generated with the unscoped deterministicId(name) formula below) was
// computed before ids were owner-scoped. Freezing its formula here is what
// keeps `npm run db:seed` idempotent for this one owner; every other owner
// uses the owner-scoped formula and gets a fully independent dataset.
export const LEGACY_SEED_OWNER_ID = "2d2c216c-ec01-491f-a795-2f4f2539b58e";

// The one function every fixture builder calls to mint a row id. `legacyId`
// is only ever supplied for the handful of ids that were bare hand-typed
// literals (not even deterministicId(name)) from the original pre-sandbox
// seed — e.g. the original three accounts. Any other owner never sees that
// literal; it gets `${ownerId}:${name}` hashed instead, so two different
// owners never collide on a row id even when generating "the same" fixture
// (e.g. both owners' "checking account").
export function fixtureId(ownerId: string, name: string, legacyId?: string): string {
  if (ownerId === LEGACY_SEED_OWNER_ID) {
    return legacyId ?? deterministicId(name);
  }
  return deterministicId(`${ownerId}:${name}`);
}

// mulberry32 — a small, fast, deterministic PRNG. Seeded with a fixed
// integer and always advanced in the same fixed generation order (plain
// sequential calls during fixture building, never influenced by Date.now,
// object key iteration of a Map/Set, or any other run-to-run-variable
// source), so the exact same sequence of "random-looking" values comes out
// on every run. This is what "deterministic but not suspiciously uniform"
// amounts (grocery trips, fuel fill-ups, etc.) are built from — never
// Math.random().
export function createRng(seed: number): () => number {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Inclusive-inclusive integer range, e.g. rngInt(rng, 60, 140) => 60..140.
export function rngInt(rng: () => number, min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}

// A dollar amount in [min, max], as a fixed-2-decimal string (matching the
// numeric(19,4) column's expected input shape used throughout the app).
export function rngAmount(rng: () => number, min: number, max: number): string {
  const cents = rngInt(rng, Math.round(min * 100), Math.round(max * 100));
  return (cents / 100).toFixed(2);
}

// Picks a deterministic element from a fixed list — same rng-advance
// contract as rngInt/rngAmount above.
export function rngPick<T>(rng: () => number, items: readonly T[]): T {
  return items[rngInt(rng, 0, items.length - 1)];
}

// ---- Date math -------------------------------------------------------
// All calendar arithmetic here operates on fixed ISO date strings
// (YYYY-MM-DD), never `new Date()` with no arguments — the seed dataset's
// dates are anchored to a fixed point in time chosen when this dataset was
// built (see fixtures/window.ts), not to whatever day the script happens
// to run on. Re-running the seed a year from now must produce the exact
// same dates it produced today.

export function addDays(iso: string, days: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function addMonths(iso: string, months: number): string {
  const date = new Date(`${iso}T00:00:00Z`);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + months);
  // Clamp to the target month's last day (e.g. Jan 31 + 1mo should land on
  // Feb 28/29, not roll over into March).
  const daysInTargetMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, daysInTargetMonth));
  return date.toISOString().slice(0, 10);
}

export function compareDates(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Steps from startDate to endDate (inclusive) at roughly avgIntervalDays
// apart, with deterministic +/-jitterDays variation each step (drawn from
// the given rng, so the exact same dates come out every run for the same
// rng state) — this is what gives "twice a week groceries" its realistic,
// non-metronomic spacing without ever calling Date.now() or Math.random().
export function iterateDeterministicDates(
  startDate: string,
  endDate: string,
  avgIntervalDays: number,
  jitterDays: number,
  rng: () => number,
): string[] {
  const dates: string[] = [];
  let current = startDate;
  while (compareDates(current, endDate) <= 0) {
    dates.push(current);
    const jitter = jitterDays > 0 ? rngInt(rng, -jitterDays, jitterDays) : 0;
    const step = Math.max(1, avgIntervalDays + jitter);
    current = addDays(current, step);
  }
  return dates;
}
