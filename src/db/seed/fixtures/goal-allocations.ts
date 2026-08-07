import type { NewGoalAllocation } from "../../schema";
import { fixtureId } from "../deterministic";
import { accountIds } from "./accounts";
import { goalIds } from "./goals";

// ADR-0003 Goal Allocation Model, exercised across the same five/six goals
// fixtures/goals.ts already seeds — chosen to cover every required
// sandbox scenario without inventing new goals beyond College Fund (the
// CD-funded one):
//   - one account -> multiple goals: emergencySavings funds both
//     Emergency Fund and House Down Payment.
//   - one goal -> multiple accounts: House Down Payment draws from both
//     emergencySavings and householdSavings.
//   - partial allocation: every allocation below leaves its account with
//     a real, non-zero unallocated remainder (verified by the balance
//     math in the comments).
//   - exact full allocation: College Fund's $8,000 target is allocated
//     from the CD in a single $8,000 allocation.
//   - CD funding: the CD (accountType "other-asset") funds College Fund.
//   - overfunding: Emergency Fund's manual contributions ($14,400, see
//     fixtures/goals.ts) plus this $6,000 allocation total $20,400 against
//     a $20,000 target.
//   - manual-only progress (no allocation at all): Roth IRA Contribution
//     and Debt Payoff are deliberately left untouched here, so the
//     sandbox also proves the calculation model handles a goal funded
//     purely by manual contributions, with allocatedAmount honestly 0.
export function goalAllocationFixtures(ownerId: string): NewGoalAllocation[] {
  const goals = goalIds(ownerId);
  const accounts = accountIds(ownerId);

  return [
    // emergencySavings ($18,400.00 balance) split three ways: $6,000 to
    // Emergency Fund, $3,000 to House Down Payment, $9,400 left
    // unallocated.
    {
      id: fixtureId(ownerId, "goal-allocation:emergency-fund:emergency-savings"),
      ownerId,
      goalId: goals.emergencyFund,
      accountId: accounts.emergencySavings,
      amount: "6000.00",
    },
    {
      id: fixtureId(ownerId, "goal-allocation:house-down-payment:emergency-savings"),
      ownerId,
      goalId: goals.houseDownPayment,
      accountId: accounts.emergencySavings,
      amount: "3000.00",
    },
    // householdSavings ($6,250.48 balance): $2,000 to House Down Payment,
    // $4,250.48 left unallocated.
    {
      id: fixtureId(ownerId, "goal-allocation:house-down-payment:household-savings"),
      ownerId,
      goalId: goals.houseDownPayment,
      accountId: accounts.householdSavings,
      amount: "2000.00",
    },
    // The 12-Month CD ($10,184.22 balance): $8,000 exactly funds College
    // Fund's full target, $2,184.22 left unallocated.
    {
      id: fixtureId(ownerId, "goal-allocation:college-fund:cd"),
      ownerId,
      goalId: goals.collegeFund,
      accountId: accounts.cd,
      amount: "8000.00",
    },
  ];
}
