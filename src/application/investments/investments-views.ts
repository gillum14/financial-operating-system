// Presentation-shaped view model for the Investments workspace, kept
// outside src/composition/ (server-only) so "use client" components can
// import this *type* without pulling in a composition-root module — same
// pattern as Transactions/Accounts/Budgets/Goals/Reports/Missions.
//
// TECH DEBT: there is no Investments domain yet — no schema table,
// repository, service, or Server Action. Portfolios, holdings, gains/
// losses, allocation, and performance are not concepts this app computes
// anywhere (the "investment"/"retirement" account *types* on the Accounts
// domain are just labels — they carry no holdings, positions, or market
// data). `hasInvestments` is hard-coded false until a real Investments
// slice exists. Every field below is honestly empty, never a fabricated
// number.
export interface InvestmentsOverviewView {
  hasInvestments: boolean;
}
