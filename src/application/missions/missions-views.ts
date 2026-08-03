// Presentation-shaped view model for the Missions workspace, kept outside
// src/composition/ (server-only) so "use client" components can import
// this *type* without pulling in a composition-root module — same pattern
// as Transactions/Accounts/Budgets/Goals/Reports.
//
// TECH DEBT: there is no Missions domain yet — no schema table,
// repository, service, or Server Action. Missions, points, levels,
// streaks, XP, and rewards are not concepts this app computes anywhere.
// `hasMissions` is hard-coded false until a real Missions slice exists.
// Every field below is honestly empty, never a fabricated number.
export interface MissionsOverviewView {
  hasMissions: boolean;
}
