/**
 * User entity type — maps to the `users` table.
 * The `id` matches the Supabase Auth `auth.users.id`.
 */
export interface User {
  id: string;
  email: string;
  display_name: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

/** Fields returned to the client (excludes sensitive columns) */
export type UserProfile = Omit<User, 'created_at' | 'updated_at'> & {
  created_at: string;
};
