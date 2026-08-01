import "server-only";

import { cache } from "react";

import { UserService } from "@/application/users/service";
import { db } from "@/db/client";
import type { User } from "@/domains/users/types";
import { DrizzleUserRepository } from "@/infrastructure/db/users-repository";

let userService: UserService | undefined;

function getUserService(): UserService {
  if (!userService) {
    userService = new UserService(new DrizzleUserRepository(db));
  }
  return userService;
}

// Cached per request: the (authenticated) layout and the dashboard page
// both need the profile (for the sidebar and the greeting, respectively).
export const getUserProfile = cache(async (userId: string): Promise<User | null> => {
  return getUserService().getUser(userId);
});
