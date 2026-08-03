// Presentation-shaped view model for the Retirement workspace, kept
// outside src/composition/ (server-only) so "use client" components can
// import this *type* without pulling in a composition-root module — same
// pattern as Transactions/Accounts/Budgets/Goals/Reports/Missions/
// Investments.
//
// TECH DEBT: there is no Retirement domain yet — no schema table,
// repository, service, or Server Action. Retirement balances, projections,
// target retirement age, withdrawal estimates, and readiness/probability
// scores are not concepts this app computes anywhere (the "retirement"
// Account *type* on the Accounts domain is just a label — it carries no
// contribution history, projection, or planning data).
// `hasRetirementPlan` is hard-coded false until a real Retirement slice
// exists. Every field below is honestly empty, never a fabricated number.
export interface RetirementOverviewView {
  hasRetirementPlan: boolean;
}
