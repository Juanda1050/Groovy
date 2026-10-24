import { supabase } from "@/lib/supabaseClient";
import type { Profile, ProfileInput } from "@/models/profile";

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
  const { data, error } = await supabase.rpc("save_profile", {
    p_display_name: input.displayName,
    p_username: input.username,
    p_bio: input.bio,
  });

  if (error) throw error;

  return data;
}
