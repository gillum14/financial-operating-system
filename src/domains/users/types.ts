import type { NewUser, User } from "@/db/schema/users";

export type { User };

export type UserCreateInput = Omit<NewUser, "id" | "createdAt" | "updatedAt" | "deletedAt">;

export type UserUpdateInput = Partial<Omit<NewUser, "id" | "createdAt" | "updatedAt" | "deletedAt">>;
