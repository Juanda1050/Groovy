import { useAuthStore } from "@/features/auth/stores/authStore";
import { invokeSpotify } from "@/features/catalog/services/spotifyService";
import {
  createSignal,
  requireUser,
} from "@/features/library/services/libraryService";
import {
  artistPageSchema,
  musicOnboardingSchema,
  onboardingArtistIdsSchema,
} from "@/features/preferences/lib/musicOnboardingSchemas";
import type {
  ArtistCatalogRequest,
  MusicOnboarding,
  OnboardingArtistPage,
  OnboardingFavorites,
} from "@/models/musicOnboarding";
import { supabase } from "@/shared/lib/supabaseClient";

function assertActive(userId: string, signal?: AbortSignal): void {
  signal?.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getOnboardingArtists(
  userId: string,
  request: ArtistCatalogRequest,
  signal: AbortSignal,
): Promise<OnboardingArtistPage> {
  assertActive(userId, signal);

  const data = await invokeSpotify(request, signal);

  assertActive(userId, signal);

  const parsed = artistPageSchema.safeParse(data);

  if (!parsed.success) {
    throw new Error("INVALID_ARTIST_RESPONSE");
  }

  return parsed.data;
}

export async function getMusicOnboarding(
  userId: string,
  signal?: AbortSignal,
): Promise<MusicOnboarding | null> {
  const requestSignal = createSignal(signal);

  assertActive(userId, requestSignal);
  await requireUser(userId);
  assertActive(userId, requestSignal);

  const { data, error } = await supabase
    .from("music_onboarding")
    .select("*")
    .eq("user_id", userId)
    .abortSignal(requestSignal)
    .maybeSingle();

  assertActive(userId, requestSignal);

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const parsed = musicOnboardingSchema.safeParse(data);

  if (!parsed.success || parsed.data.user_id !== userId) {
    throw new Error("INVALID_ONBOARDING_RESPONSE");
  }

  return parsed.data;
}

export async function completeMusicOnboarding({
  userId,
  artistIds,
  albumIds = [],
  trackIds = [],
  knownAlbumIds = [],
}: {
  userId: string;
  artistIds: readonly string[];
  albumIds?: OnboardingFavorites["albumIds"];
  trackIds?: OnboardingFavorites["trackIds"];
  knownAlbumIds?: OnboardingFavorites["knownAlbumIds"];
}): Promise<MusicOnboarding> {
  const artists = onboardingArtistIdsSchema.safeParse(artistIds);

  const albums = musicOnboardingSchema.shape.album_ids.safeParse(albumIds);

  const tracks = musicOnboardingSchema.shape.track_ids.safeParse(trackIds);

  const knownAlbums =
    musicOnboardingSchema.shape.known_album_ids.safeParse(knownAlbumIds);

  if (!artists.success) {
    throw new Error("INVALID_ONBOARDING_ARTISTS");
  }

  if (!albums.success || !tracks.success || !knownAlbums.success) {
    throw new Error("INVALID_ONBOARDING_SELECTION");
  }

  const excludedAlbums = [...new Set([...knownAlbums.data, ...albums.data])];

  const validatedKnownAlbums =
    musicOnboardingSchema.shape.known_album_ids.safeParse(excludedAlbums);

  if (!validatedKnownAlbums.success) {
    throw new Error("INVALID_ONBOARDING_SELECTION");
  }

  const signal = createSignal();

  assertActive(userId, signal);
  await requireUser(userId);
  assertActive(userId, signal);

  try {
    const { data, error } = await supabase
      .rpc("complete_music_onboarding", {
        p_artist_ids: artists.data,
        p_album_ids: albums.data,
        p_track_ids: tracks.data,
        p_known_album_ids: validatedKnownAlbums.data,
      })
      .abortSignal(signal);

    assertActive(userId, signal);

    if (error) {
      throw error;
    }

    const saved = musicOnboardingSchema.safeParse(data);

    if (!saved.success || saved.data.user_id !== userId) {
      throw new Error("INVALID_ONBOARDING_RESPONSE");
    }

    return saved.data;
  } catch (error: unknown) {
    assertActive(userId);

    try {
      const saved = await getMusicOnboarding(userId);

      if (saved) {
        return saved;
      }
    } catch {
      assertActive(userId);
    }

    throw error;
  }
}
