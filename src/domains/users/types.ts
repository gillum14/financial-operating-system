import type { NewUser, User } from "@/db/schema/users";

export type { User };

// id is required (not omitted): a public.users row can only ever be
// created for an id that already exists in auth.users (enforced by the FK
// in the users table), so it's never independently generated here. In
// production this only ever happens via the handle_new_user trigger; this
// type exists for the repository/service layer and DB-gated tests that
// need a matching profile row for an id they already control.
export type UserCreateInput = Omit<NewUser, "createdAt" | "updatedAt" | "deletedAt">;

export type UserUpdateInput = Partial<Omit<NewUser, "id" | "createdAt" | "updatedAt" | "deletedAt">>;
