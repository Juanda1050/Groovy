import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  createSignal,
  requireUser,
} from "@/features/library/services/libraryService";
import {
  musicEntityTypeSchema,
  musicPreferenceIdsSchema,
  musicPreferenceSchema,
  setMusicPreferenceSchema,
} from "@/features/preferences/lib/musicPreferenceSchemas";
import type {
  GetMusicPreferencesInput,
  MusicPreference,
  MusicPreferenceBatch,
  SetMusicPreferenceInput,
} from "@/models/musicPreferences";
import { supabase } from "@/shared/lib/supabaseClient";

function assertActive(userId: string, signal: AbortSignal): void {
  signal.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getMusicPreferences({
  userId,
  entityType,
  spotifyIds,
  signal,
}: GetMusicPreferencesInput): Promise<MusicPreferenceBatch> {
  const entity = musicEntityTypeSchema.safeParse(entityType);

  const ids = musicPreferenceIdsSchema.safeParse([...new Set(spotifyIds)]);

  if (!entity.success || !ids.success) {
    throw new Error("INVALID_MUSIC_PREFERENCE");
  }

  const requestSignal = createSignal(signal);

  assertActive(userId, requestSignal);
  await requireUser(userId);
  assertActive(userId, requestSignal);

  const result: MusicPreferenceBatch = Object.fromEntries(
    ids.data.map((id) => [id, null]),
  );

  if (ids.data.length === 0) {
    return result;
  }

  const { data, error } = await supabase
    .from("user_music_preferences")
    .select("*")
    .eq("user_id", userId)
    .eq("entity_type", entity.data)
    .in("spotify_id", ids.data)
    .abortSignal(requestSignal);

  assertActive(userId, requestSignal);

  if (error) {
    throw error;
  }

  for (const value of data ?? []) {
    const parsed = musicPreferenceSchema.safeParse(value);

    if (
      !parsed.success ||
      parsed.data.user_id !== userId ||
      parsed.data.entity_type !== entity.data ||
      !Object.hasOwn(result, parsed.data.spotify_id) ||
      result[parsed.data.spotify_id] !== null
    ) {
      throw new Error("INVALID_MUSIC_PREFERENCE_RESPONSE");
    }

    result[parsed.data.spotify_id] = parsed.data;
  }

  return result;
}

export async function setMusicPreference(
  input: SetMusicPreferenceInput,
): Promise<MusicPreference> {
  const parsed = setMusicPreferenceSchema.safeParse(input);

  if (!parsed.success) {
    throw new Error("INVALID_MUSIC_PREFERENCE");
  }

  const request = parsed.data;
  const signal = createSignal();

  assertActive(request.userId, signal);
  await requireUser(request.userId);
  assertActive(request.userId, signal);

  const { data, error } = await supabase
    .rpc("set_music_preference", {
      p_entity_type: request.entityType,
      p_spotify_id: request.spotifyId,
      p_action: request.action,
      p_active: request.active,
      p_expected_revision: request.expectedRevision,
    })
    .abortSignal(signal);

  assertActive(request.userId, signal);

  if (error) {
    throw error;
  }

  const saved = musicPreferenceSchema.safeParse(data);

  if (
    !saved.success ||
    saved.data.user_id !== request.userId ||
    saved.data.entity_type !== request.entityType ||
    saved.data.spotify_id !== request.spotifyId ||
    saved.data.revision < request.expectedRevision ||
    (request.action === "favorite" &&
      saved.data.is_favorite !== request.active) ||
    (request.action !== "favorite" &&
      (request.active
        ? saved.data.sentiment !== request.action
        : saved.data.sentiment === request.action))
  ) {
    throw new Error("INVALID_MUSIC_PREFERENCE_RESPONSE");
  }

  return saved.data;
}
