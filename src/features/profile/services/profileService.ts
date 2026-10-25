import type { UpdateLanguageInput } from "@/models/language";
import type { Profile,ProfileInput,UserSettings } from "@/models/profile";
import { supabase } from "@/shared/lib/supabaseClient";

export function createSignal(): AbortSignal {
  return AbortSignal.timeout(12_000);
}

export async function requireUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  if (data.session?.user.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getProfile(
  userId: string,
  signal: AbortSignal,
): Promise<Profile> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return data;
}

export async function saveProfile(input: ProfileInput): Promise<Profile> {
  const { data, error } = await supabase
    .rpc("save_profile", {
      p_display_name: input.displayName,
      p_username: input.username,
      p_bio: input.bio,
    })
    .abortSignal(createSignal());

  if (error) throw error;
  return data;
}

export async function getUserSettings(
  userId: string,
  signal: AbortSignal,
): Promise<UserSettings> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("user_id, locale")
    .eq("user_id", userId)
    .abortSignal(signal)
    .single();

  if (error) throw error;
  return data;
}

export async function updateLanguage({
  userId,
  locale,
}: UpdateLanguageInput): Promise<void> {
  const { data, error } = await supabase
    .from("user_settings")
    .update({ locale })
    .eq("user_id", userId)
    .select("user_id")
    .single();

  if (error) throw error;
  if (!data) throw new Error("Settings update failed.");
}
