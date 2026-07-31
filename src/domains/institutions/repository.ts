import type { Institution, InstitutionCreateInput, InstitutionUpdateInput } from "./types";

export interface InstitutionRepository {
  getById(id: string): Promise<Institution | null>;
  list(): Promise<Institution[]>;
  create(input: InstitutionCreateInput): Promise<Institution>;
  update(id: string, changes: InstitutionUpdateInput): Promise<Institution>;
  softDelete(id: string): Promise<void>;
}
