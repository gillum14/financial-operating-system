import type { NewCategory } from "../../schema";
import { fixtureId } from "../deterministic";

// One group per top-level category: its own id/name, plus its children's
// id/name. Two levels only, enforced structurally here (a "children" list
// of plain {id, name} pairs has no way to nest a third level) as well as
// by CategoryService itself at write time.
interface CategoryGroup {
  id: string;
  name: string;
  children: { id: string; name: string }[];
}

// The original five top-level categories and three children keep their
// exact original ids for LEGACY_SEED_OWNER_ID only (see deterministic.ts's
// fixtureId) — already live in the seeded database, and possibly
// referenced by the original ten transactions, which are also preserved.
// Every other owner gets its own derived id for the equivalent category.
export function categoryGroups(ownerId: string): CategoryGroup[] {
  const id = (name: string, legacyId?: string) => fixtureId(ownerId, name, legacyId);

  return [
    {
      id: id("category:housing", "00000000-0000-0000-0000-000000000201"),
      name: "Housing",
      children: [
        { id: id("category:housing:rent", "00000000-0000-0000-0000-000000000202"), name: "Rent" },
        { id: id("category:housing:mortgage-payment"), name: "Mortgage Payment" },
        { id: id("category:housing:home-maintenance"), name: "Home Maintenance" },
        { id: id("category:housing:home-insurance"), name: "Home Insurance" },
      ],
    },
    {
      id: id("category:food", "00000000-0000-0000-0000-000000000203"),
      name: "Food & Dining",
      children: [
        { id: id("category:food:groceries", "00000000-0000-0000-0000-000000000204"), name: "Groceries" },
        { id: id("category:food:restaurants", "00000000-0000-0000-0000-000000000205"), name: "Restaurants" },
        { id: id("category:food:coffee-shops"), name: "Coffee Shops" },
      ],
    },
    {
      id: id("category:transportation", "00000000-0000-0000-0000-000000000206"),
      name: "Transportation",
      children: [
        { id: id("category:transportation:auto-loan-payment"), name: "Auto Loan Payment" },
        { id: id("category:transportation:fuel"), name: "Fuel" },
        { id: id("category:transportation:auto-insurance"), name: "Auto Insurance" },
        { id: id("category:transportation:auto-maintenance"), name: "Auto Maintenance" },
      ],
    },
    {
      id: id("category:utilities", "00000000-0000-0000-0000-000000000207"),
      name: "Utilities",
      children: [
        { id: id("category:utilities:electric"), name: "Electric" },
        { id: id("category:utilities:water-sewer"), name: "Water & Sewer" },
        { id: id("category:utilities:internet-cable"), name: "Internet & Cable" },
      ],
    },
    {
      id: id("category:income", "00000000-0000-0000-0000-000000000208"),
      name: "Income",
      children: [
        { id: id("category:income:salary"), name: "Salary" },
        { id: id("category:income:freelance-income"), name: "Freelance Income" },
        { id: id("category:income:interest-income"), name: "Interest Income" },
        { id: id("category:income:dividend-income"), name: "Dividend Income" },
      ],
    },
    {
      id: id("category:childcare"),
      name: "Childcare",
      children: [
        { id: id("category:childcare:daycare"), name: "Daycare" },
        { id: id("category:childcare:after-school-programs"), name: "After-School Programs" },
      ],
    },
    {
      id: id("category:healthcare"),
      name: "Healthcare",
      children: [
        { id: id("category:healthcare:doctor-visits"), name: "Doctor Visits" },
        { id: id("category:healthcare:pharmacy"), name: "Pharmacy" },
        { id: id("category:healthcare:dental"), name: "Dental" },
      ],
    },
    {
      id: id("category:insurance"),
      name: "Insurance",
      children: [
        { id: id("category:insurance:health-insurance"), name: "Health Insurance" },
        { id: id("category:insurance:life-insurance"), name: "Life Insurance" },
      ],
    },
    {
      id: id("category:subscriptions"),
      name: "Subscriptions",
      children: [
        { id: id("category:subscriptions:streaming-services"), name: "Streaming Services" },
        { id: id("category:subscriptions:software-apps"), name: "Software & Apps" },
      ],
    },
    {
      id: id("category:travel"),
      name: "Travel",
      children: [
        { id: id("category:travel:flights"), name: "Flights" },
        { id: id("category:travel:lodging"), name: "Lodging" },
      ],
    },
    {
      id: id("category:personal-shopping"),
      name: "Personal & Shopping",
      children: [
        { id: id("category:personal-shopping:clothing"), name: "Clothing" },
        { id: id("category:personal-shopping:electronics"), name: "Electronics" },
        { id: id("category:personal-shopping:gifts"), name: "Gifts" },
      ],
    },
    {
      id: id("category:financial"),
      name: "Financial",
      children: [
        { id: id("category:financial:bank-fees"), name: "Bank Fees" },
        { id: id("category:financial:credit-card-interest"), name: "Credit Card Interest" },
        { id: id("category:financial:legal-and-tax"), name: "Legal & Tax" },
      ],
    },
  ];
}

export const categoryParentFixtures = (ownerId: string): NewCategory[] =>
  categoryGroups(ownerId).map((group) => ({ id: group.id, ownerId, name: group.name }));

export const categoryChildFixtures = (ownerId: string): NewCategory[] =>
  categoryGroups(ownerId).flatMap((group) =>
    group.children.map((child) => ({ id: child.id, ownerId, name: child.name, parentCategoryId: group.id })),
  );

// Readable-name lookup for the transaction generators — e.g.
// categoryIdByName(ownerId)["Groceries"] — so generators reference
// categories by their display name (self-documenting at the call site)
// instead of by raw id exports every generator would otherwise need to
// import individually. Owner-scoped like everything else here, since the
// ids themselves are owner-scoped.
export function categoryIdByName(ownerId: string): Record<string, string> {
  const groups = categoryGroups(ownerId);
  return Object.fromEntries([
    ...groups.map((group) => [group.name, group.id] as const),
    ...groups.flatMap((group) => group.children.map((child) => [child.name, child.id] as const)),
  ]);
}
