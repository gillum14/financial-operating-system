import type {
  DataProviderConnection,
  DataProviderConnectionStatus,
  NewDataProviderConnection,
} from "@/db/schema/data-provider-connections";

export type { DataProviderConnection, DataProviderConnectionStatus };

export type DataProviderConnectionCreateInput = Omit<
  NewDataProviderConnection,
  "id" | "createdAt" | "updatedAt" | "deletedAt"
>;

export type DataProviderConnectionUpdateInput = Partial<
  Omit<NewDataProviderConnection, "id" | "ownerId" | "createdAt" | "updatedAt" | "deletedAt">
>;
