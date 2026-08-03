// Categories have no real color of their own in the domain model — this
// cycles through the app's chart palette, keyed by category so the same
// category always renders the same color everywhere it appears (the
// transactions table's pills, the spending summary's bars). Visual
// variety for scanability only, never presented as a user-set attribute.
const CATEGORY_TONES = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
];

export function categoryTone(key: string): string {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) {
    hash = (hash * 31 + key.charCodeAt(i)) >>> 0;
  }
  return CATEGORY_TONES[hash % CATEGORY_TONES.length];
}
