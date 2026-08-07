import type { NewDataProviderConnection } from "../../schema";
import { fixtureId } from "../deterministic";
import { INSTITUTION_CASCADE_ID, INSTITUTION_MERIDIAN_ID } from "./institutions";

export interface ConnectionIds {
  manual: string;
  meridian: string;
}

// The original manual connection keeps its exact original id for
// LEGACY_SEED_OWNER_ID only — see deterministic.ts's fixtureId.
export function connectionIds(ownerId: string): ConnectionIds {
  return {
    manual: fixtureId(ownerId, "connection:manual", "00000000-0000-0000-0000-000000000401"),
    meridian: fixtureId(ownerId, "connection:meridian-manual"),
  };
}

export const connectionFixtures = (ownerId: string): NewDataProviderConnection[] => {
  const ids = connectionIds(ownerId);
  return [
    {
      id: ids.manual,
      ownerId,
      institutionId: INSTITUTION_CASCADE_ID,
      providerName: "manual",
      status: "inactive",
    },
    {
      id: ids.meridian,
      ownerId,
      institutionId: INSTITUTION_MERIDIAN_ID,
      providerName: "manual",
      status: "inactive",
    },
  ];
};
