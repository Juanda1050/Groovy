import { supabase } from "@/lib/supabaseClient";
import type { UserSettings } from "@/models/profile";
import type { UpdateLanguageInput } from "@/models/language";

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

  if (!data) {
    throw new Error("Settings update failed.");
  }
}
