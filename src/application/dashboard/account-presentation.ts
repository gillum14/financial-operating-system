import type { AccountType } from "@/domains/accounts/types";

export type AccountDisplayGroup = "Cash" | "Credit" | "Loans" | "Investments" | "Assets";

interface AccountPresentation {
  group: AccountDisplayGroup;
  label: string;
}

// Record<AccountType, ...> is exhaustive by construction: if a new value is
// ever added to ACCOUNT_TYPES, this object literal stops compiling until a
// presentation mapping is added for it here. No account type is silently
// dropped, mislabeled, or forced into an inaccurate bucket.
const ACCOUNT_PRESENTATION: Record<AccountType, AccountPresentation> = {
  checking: { group: "Cash", label: "Checking" },
  savings: { group: "Cash", label: "Savings" },
  cash: { group: "Cash", label: "Cash" },
  "credit-card": { group: "Credit", label: "Credit Card" },
  mortgage: { group: "Loans", label: "Mortgage" },
  "personal-loan": { group: "Loans", label: "Personal Loan" },
  "vehicle-loan": { group: "Loans", label: "Vehicle Loan" },
  "other-liability": { group: "Loans", label: "Other Liability" },
  investment: { group: "Investments", label: "Investment" },
  retirement: { group: "Investments", label: "Retirement" },
  property: { group: "Assets", label: "Property" },
  "other-asset": { group: "Assets", label: "Other Asset" },
};

export function getAccountPresentation(accountType: AccountType): AccountPresentation {
  return ACCOUNT_PRESENTATION[accountType];
}
