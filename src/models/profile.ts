import type { Database } from "./database";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];

export type UserSettings = Database["public"]["Tables"]["user_settings"]["Row"];

export type ProfileUpdate = Pick<
  Database["public"]["Tables"]["profiles"]["Update"],
  "username" | "display_name" | "avatar_url" | "bio"
>;
