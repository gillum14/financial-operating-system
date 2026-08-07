import type { NewAccount } from "../../schema";
import { addMonths, fixtureId } from "../deterministic";
import { INSTITUTION_CASCADE_ID, INSTITUTION_HARBOR_ID, INSTITUTION_MERIDIAN_ID } from "./institutions";
import { SEED_LATEST_TRANSACTION_DATE, SEED_LONG_STANDING_ACCOUNT_OPENING_DATE } from "./window";

// Every id below is owner-scoped via fixtureId() — see deterministic.ts.
// The three `legacyId` arguments are the original bare-literal ids from
// the pre-sandbox seed, preserved only for LEGACY_SEED_OWNER_ID; any other
// owner gets a freshly derived id instead, so multiple seed owners can
// coexist without colliding on a row id.
export interface AccountIds {
  checking: string;
  emergencySavings: string;
  householdSavings: string;
  creditCard: string;
  cashbackCreditCard: string;
  mortgage: string;
  property: string;
  autoLoan: string;
  brokerage: string;
  k401: string;
  rothIra: string;
  cd: string;
}

export function accountIds(ownerId: string): AccountIds {
  return {
    checking: fixtureId(ownerId, "account:checking", "00000000-0000-0000-0000-000000000301"),
    emergencySavings: fixtureId(ownerId, "account:emergency-savings", "00000000-0000-0000-0000-000000000302"),
    creditCard: fixtureId(ownerId, "account:credit-card", "00000000-0000-0000-0000-000000000303"),
    householdSavings: fixtureId(ownerId, "account:household-savings"),
    cashbackCreditCard: fixtureId(ownerId, "account:cashback-credit-card"),
    mortgage: fixtureId(ownerId, "account:mortgage"),
    property: fixtureId(ownerId, "account:primary-residence"),
    autoLoan: fixtureId(ownerId, "account:auto-loan"),
    brokerage: fixtureId(ownerId, "account:brokerage"),
    k401: fixtureId(ownerId, "account:401k"),
    rothIra: fixtureId(ownerId, "account:roth-ira"),
    cd: fixtureId(ownerId, "account:certificate-of-deposit"),
  };
}

// The CD is the one account that opens mid-window (12 months before the
// latest seeded transaction date) rather than long before it — see
// window.ts. Its interest-income transactions (fixtures/transactions/
// recurring.ts) only start from this date onward, so "transactions must
// align with account history" has a real case to hold up, not just
// long-standing accounts with no start-of-history edge to test.
export const ACCOUNT_CD_OPENING_DATE = addMonths(SEED_LATEST_TRANSACTION_DATE, -12);

export const accountFixtures = (ownerId: string): NewAccount[] => {
  const ids = accountIds(ownerId);
  return [
    {
      id: ids.checking,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      name: "Everyday Checking",
      accountType: "checking",
      maskedAccountNumber: "••••4521",
      status: "active",
      balanceSource: "manual",
      currentBalance: "4820.13",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.emergencySavings,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      name: "Emergency Fund Savings",
      accountType: "savings",
      maskedAccountNumber: "••••7788",
      status: "active",
      balanceSource: "manual",
      currentBalance: "18400.00",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.householdSavings,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      name: "Household Savings",
      accountType: "savings",
      maskedAccountNumber: "••••3310",
      status: "active",
      balanceSource: "manual",
      currentBalance: "6250.48",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.creditCard,
      ownerId,
      institutionId: INSTITUTION_HARBOR_ID,
      name: "Rewards Credit Card",
      accountType: "credit-card",
      maskedAccountNumber: "••••1092",
      status: "active",
      balanceSource: "manual",
      currentBalance: "-1284.55",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.cashbackCreditCard,
      ownerId,
      institutionId: INSTITUTION_HARBOR_ID,
      name: "Cash Back Credit Card",
      accountType: "credit-card",
      maskedAccountNumber: "••••5567",
      status: "active",
      balanceSource: "manual",
      currentBalance: "-642.10",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.mortgage,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      name: "Home Mortgage",
      accountType: "mortgage",
      maskedAccountNumber: "••••9004",
      status: "active",
      balanceSource: "manual",
      currentBalance: "-318450.00",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.property,
      ownerId,
      institutionId: null,
      name: "Primary Residence",
      accountType: "property",
      maskedAccountNumber: null,
      status: "active",
      balanceSource: "manual",
      currentBalance: "432000.00",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
      notes: "Manually tracked home value, paired with the Home Mortgage liability.",
    },
    {
      id: ids.autoLoan,
      ownerId,
      institutionId: INSTITUTION_HARBOR_ID,
      name: "Auto Loan",
      accountType: "vehicle-loan",
      maskedAccountNumber: "••••2281",
      status: "active",
      balanceSource: "manual",
      currentBalance: "-14670.32",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.brokerage,
      ownerId,
      institutionId: INSTITUTION_MERIDIAN_ID,
      name: "Brokerage Account",
      accountType: "investment",
      maskedAccountNumber: "••••6120",
      status: "active",
      balanceSource: "manual",
      currentBalance: "42380.91",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.k401,
      ownerId,
      institutionId: INSTITUTION_MERIDIAN_ID,
      name: "401(k) Retirement",
      accountType: "retirement",
      maskedAccountNumber: "••••7742",
      status: "active",
      balanceSource: "manual",
      currentBalance: "96540.27",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.rothIra,
      ownerId,
      institutionId: INSTITUTION_MERIDIAN_ID,
      name: "Roth IRA",
      accountType: "retirement",
      maskedAccountNumber: "••••8815",
      status: "active",
      balanceSource: "manual",
      currentBalance: "23105.60",
      openingDate: SEED_LONG_STANDING_ACCOUNT_OPENING_DATE,
    },
    {
      id: ids.cd,
      ownerId,
      institutionId: INSTITUTION_MERIDIAN_ID,
      name: "12-Month Certificate of Deposit",
      accountType: "other-asset",
      maskedAccountNumber: "••••4490",
      status: "active",
      balanceSource: "manual",
      currentBalance: "10184.22",
      openingDate: ACCOUNT_CD_OPENING_DATE,
      notes: "12-month term CD, opened mid-window to exercise account-history-aligned dates.",
    },
  ];
};
