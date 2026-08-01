import type { NewAccount, NewCategory, NewDataProviderConnection, NewInstitution, NewTransaction } from "../schema";

// Every row below uses a fixed, hardcoded UUID so the seed script can be
// re-run safely (onConflictDoNothing keys off these). All names,
// institutions, and amounts are synthetic — no real people, accounts, or
// financial institutions are represented here.
//
// public.users rows are never seeded directly here — they are created
// exclusively by the handle_new_user trigger when a real Supabase Auth
// user signs up (see src/db/migrations/0002_handle_new_user_trigger.sql).
// buildDevData() takes that real user's id as ownerId, since every
// FK-referencing row below requires one to already exist.

export const INSTITUTION_CASCADE_ID = "00000000-0000-0000-0000-000000000101";
export const INSTITUTION_HARBOR_ID = "00000000-0000-0000-0000-000000000102";

export const CATEGORY_HOUSING_ID = "00000000-0000-0000-0000-000000000201";
export const CATEGORY_RENT_ID = "00000000-0000-0000-0000-000000000202";
export const CATEGORY_FOOD_ID = "00000000-0000-0000-0000-000000000203";
export const CATEGORY_GROCERIES_ID = "00000000-0000-0000-0000-000000000204";
export const CATEGORY_RESTAURANTS_ID = "00000000-0000-0000-0000-000000000205";
export const CATEGORY_TRANSPORTATION_ID = "00000000-0000-0000-0000-000000000206";
export const CATEGORY_UTILITIES_ID = "00000000-0000-0000-0000-000000000207";
export const CATEGORY_INCOME_ID = "00000000-0000-0000-0000-000000000208";

export const ACCOUNT_CHECKING_ID = "00000000-0000-0000-0000-000000000301";
export const ACCOUNT_SAVINGS_ID = "00000000-0000-0000-0000-000000000302";
export const ACCOUNT_CREDIT_CARD_ID = "00000000-0000-0000-0000-000000000303";

export const CONNECTION_MANUAL_ID = "00000000-0000-0000-0000-000000000401";

export function buildDevData(ownerId: string) {
  const devInstitutions: NewInstitution[] = [
    {
      id: INSTITUTION_CASCADE_ID,
      name: "Cascade Community Bank",
      providerName: "manual",
    },
    {
      id: INSTITUTION_HARBOR_ID,
      name: "Harbor Trust Credit Union",
      providerName: "manual",
    },
  ];

  // Parent categories first, then children — insertion order matters
  // because child rows reference their parent's id via a self-referencing FK.
  const devParentCategories: NewCategory[] = [
    { id: CATEGORY_HOUSING_ID, ownerId, name: "Housing" },
    { id: CATEGORY_FOOD_ID, ownerId, name: "Food & Dining" },
    { id: CATEGORY_TRANSPORTATION_ID, ownerId, name: "Transportation" },
    { id: CATEGORY_UTILITIES_ID, ownerId, name: "Utilities" },
    { id: CATEGORY_INCOME_ID, ownerId, name: "Income" },
  ];

  const devChildCategories: NewCategory[] = [
    { id: CATEGORY_RENT_ID, ownerId, name: "Rent", parentCategoryId: CATEGORY_HOUSING_ID },
    { id: CATEGORY_GROCERIES_ID, ownerId, name: "Groceries", parentCategoryId: CATEGORY_FOOD_ID },
    { id: CATEGORY_RESTAURANTS_ID, ownerId, name: "Restaurants", parentCategoryId: CATEGORY_FOOD_ID },
  ];

  const devAccounts: NewAccount[] = [
    {
      id: ACCOUNT_CHECKING_ID,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      name: "Everyday Checking",
      accountType: "checking",
      maskedAccountNumber: "••••4521",
      status: "active",
      balanceSource: "manual",
      currentBalance: "3245.67",
      openingDate: "2023-01-15",
    },
    {
      id: ACCOUNT_SAVINGS_ID,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      name: "Emergency Fund Savings",
      accountType: "savings",
      maskedAccountNumber: "••••7788",
      status: "active",
      balanceSource: "manual",
      currentBalance: "12500.00",
      openingDate: "2023-01-15",
    },
    {
      id: ACCOUNT_CREDIT_CARD_ID,
      ownerId,
      institutionId: INSTITUTION_HARBOR_ID,
      name: "Rewards Credit Card",
      accountType: "credit-card",
      maskedAccountNumber: "••••1092",
      status: "active",
      balanceSource: "manual",
      currentBalance: "-540.32",
      openingDate: "2023-06-01",
    },
  ];

  const devTransactions: NewTransaction[] = [
    {
      id: "00000000-0000-0000-0000-000000000501",
      ownerId,
      accountId: ACCOUNT_CHECKING_ID,
      categoryId: CATEGORY_INCOME_ID,
      transactionDate: "2026-07-01",
      originalDescription: "ACME CORP PAYROLL",
      merchant: "Acme Corp",
      amount: "2500.00",
      transactionType: "income",
    },
    {
      id: "00000000-0000-0000-0000-000000000502",
      ownerId,
      accountId: ACCOUNT_CHECKING_ID,
      categoryId: CATEGORY_RENT_ID,
      transactionDate: "2026-07-01",
      originalDescription: "RIVERSTONE PROPERTIES RENT",
      merchant: "Riverstone Properties",
      amount: "-1200.00",
      transactionType: "expense",
    },
    {
      id: "00000000-0000-0000-0000-000000000503",
      ownerId,
      accountId: ACCOUNT_CHECKING_ID,
      categoryId: CATEGORY_GROCERIES_ID,
      transactionDate: "2026-07-05",
      originalDescription: "GREENFIELD MARKET",
      merchant: "Greenfield Market",
      amount: "-85.43",
      transactionType: "expense",
    },
    {
      id: "00000000-0000-0000-0000-000000000504",
      ownerId,
      accountId: ACCOUNT_CREDIT_CARD_ID,
      categoryId: CATEGORY_RESTAURANTS_ID,
      transactionDate: "2026-07-08",
      originalDescription: "HARBOR VIEW BISTRO",
      merchant: "Harbor View Bistro",
      amount: "-52.10",
      transactionType: "expense",
    },
    {
      id: "00000000-0000-0000-0000-000000000505",
      ownerId,
      accountId: ACCOUNT_CREDIT_CARD_ID,
      categoryId: CATEGORY_TRANSPORTATION_ID,
      transactionDate: "2026-07-10",
      originalDescription: "SUMMIT FUEL STATION",
      merchant: "Summit Fuel Station",
      amount: "-40.00",
      transactionType: "expense",
    },
    {
      id: "00000000-0000-0000-0000-000000000506",
      ownerId,
      accountId: ACCOUNT_CHECKING_ID,
      categoryId: CATEGORY_UTILITIES_ID,
      transactionDate: "2026-07-12",
      originalDescription: "NORTHGATE ELECTRIC CO-OP",
      merchant: "Northgate Electric",
      amount: "-95.20",
      transactionType: "expense",
    },
    {
      id: "00000000-0000-0000-0000-000000000507",
      ownerId,
      accountId: ACCOUNT_CHECKING_ID,
      categoryId: null,
      transactionDate: "2026-07-15",
      originalDescription: "TRANSFER TO SAVINGS",
      amount: "-300.00",
      transactionType: "transfer",
    },
    {
      id: "00000000-0000-0000-0000-000000000508",
      ownerId,
      accountId: ACCOUNT_SAVINGS_ID,
      categoryId: null,
      transactionDate: "2026-07-15",
      originalDescription: "TRANSFER FROM CHECKING",
      amount: "300.00",
      transactionType: "transfer",
    },
    {
      id: "00000000-0000-0000-0000-000000000509",
      ownerId,
      accountId: ACCOUNT_CREDIT_CARD_ID,
      categoryId: CATEGORY_RESTAURANTS_ID,
      transactionDate: "2026-07-18",
      originalDescription: "CORNER COFFEE CO",
      merchant: "Corner Coffee Co",
      amount: "-6.75",
      transactionType: "expense",
      isExcluded: true,
    },
    {
      id: "00000000-0000-0000-0000-000000000510",
      ownerId,
      accountId: ACCOUNT_CHECKING_ID,
      categoryId: CATEGORY_INCOME_ID,
      transactionDate: "2026-07-22",
      originalDescription: "FREELANCE INVOICE #1042",
      merchant: "Freelance Client",
      amount: "450.00",
      transactionType: "income",
    },
  ];

  const devDataProviderConnections: NewDataProviderConnection[] = [
    {
      id: CONNECTION_MANUAL_ID,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      providerName: "manual",
      status: "inactive",
    },
  ];

  return {
    devInstitutions,
    devParentCategories,
    devChildCategories,
    devAccounts,
    devTransactions,
    devDataProviderConnections,
  };
}
