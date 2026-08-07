import type { NewInstitution } from "../../schema";

// The original two institutions' ids are preserved exactly — they're
// already live in the seeded database, and changing them would silently
// orphan every existing account/connection row that references them.
export const INSTITUTION_CASCADE_ID = "00000000-0000-0000-0000-000000000101";
export const INSTITUTION_HARBOR_ID = "00000000-0000-0000-0000-000000000102";
// New: a brokerage/retirement custodian for the investment-side accounts.
export const INSTITUTION_MERIDIAN_ID = "00000000-0000-0000-0000-000000000103";

export const institutionFixtures: NewInstitution[] = [
  { id: INSTITUTION_CASCADE_ID, name: "Cascade Community Bank", providerName: "manual" },
  { id: INSTITUTION_HARBOR_ID, name: "Harbor Trust Credit Union", providerName: "manual" },
  { id: INSTITUTION_MERIDIAN_ID, name: "Meridian Investment Group", providerName: "manual" },
];
