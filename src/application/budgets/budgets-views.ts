// Presentation-shaped view model for the Budgets workspace, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as src/application/transactions/transactions-views.ts and
// src/application/accounts/accounts-views.ts.
//
// TECH DEBT: there is no Budget domain yet — no schema table, repository,
// service, or Server Action. `hasBudget` is hard-coded false until one
// exists (see docs/architecture/domain-model.md's zero-based-budgeting
// section for the planned shape). Every field below is honestly empty,
// never a fabricated number.
export interface BudgetsOverviewView {
  hasBudget: boolean;
}
