export interface CurrentUser {
  name: string;
  role: string;
  initials: string;
}

// Placeholder until real auth/session exists — swap for a real session lookup later.
export const currentUser: CurrentUser = {
  name: "Caitlin Irvin",
  role: "Commander",
  initials: "CI",
};
