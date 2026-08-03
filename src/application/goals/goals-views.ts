// Presentation-shaped view model for the Goals workspace, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as Transactions/Accounts/Budgets/Reports.
//
// TECH DEBT: there is no Goals domain yet — no schema table, repository,
// service, or Server Action. `hasGoals` is hard-coded false until one
// exists. Every field below is honestly empty, never a fabricated number.
export interface GoalsOverviewView {
  hasGoals: boolean;
}
