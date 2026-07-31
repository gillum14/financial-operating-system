import type { Institution, NewInstitution } from "@/db/schema/institutions";

export type { Institution };

export type InstitutionCreateInput = Omit<NewInstitution, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type InstitutionUpdateInput = Partial<
  Omit<NewInstitution, "id" | "createdAt" | "updatedAt" | "deletedAt">
>;
