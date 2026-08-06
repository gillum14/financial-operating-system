import { getCategoriesOverview } from "@/composition/categories-query";
import { CategoriesWorkspace } from "@/features/categories/components/categories-workspace";
import { requireAuthenticatedUser } from "@/lib/auth/authenticated-user";

// Live, per-owner data resolved at request time — must never be statically
// prerendered or cached across owners (same rule as Accounts/Dashboard).
export const dynamic = "force-dynamic";

export default async function CategoriesPage() {
  const authUser = await requireAuthenticatedUser();
  const overview = await getCategoriesOverview(authUser.id);

  return <CategoriesWorkspace overview={overview} />;
}
