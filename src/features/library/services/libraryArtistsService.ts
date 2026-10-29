import { z } from "zod";

import { useAuthStore } from "@/features/auth/stores/authStore";
import {
  createSignal,
  requireUser,
} from "@/features/library/services/libraryService";
import { musicPreferenceSchema } from "@/features/preferences/lib/musicPreferenceSchemas";
import type {
  GetLibraryArtistsInput,
  LibraryArtistPage,
} from "@/models/libraryView";
import { supabase } from "@/shared/lib/supabaseClient";

const pageSize = 10;

const cachedArtistSchema = z.object({
  spotify_artist_id: z.string().regex(/^[A-Za-z0-9]{22}$/),
  name: z.string().trim().min(1),
  image_url: z.url().startsWith("https://"),
  image_width: z.number().int().positive(),
  image_height: z.number().int().positive(),
});

function assertActive(userId: string, signal: AbortSignal): void {
  signal.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getLibraryArtists({
  userId,
  page,
  signal,
}: GetLibraryArtistsInput): Promise<LibraryArtistPage> {
  if (!Number.isSafeInteger(page) || page < 1) {
    throw new Error("INVALID_LIBRARY_PAGE");
  }

  const requestSignal = createSignal(signal);

  assertActive(userId, requestSignal);
  await requireUser(userId);
  assertActive(userId, requestSignal);

  async function readPage(pageNumber: number) {
    const start = (pageNumber - 1) * pageSize;

    return supabase
      .from("user_music_preferences")
      .select("*", { count: "exact" })
      .eq("user_id", userId)
      .eq("entity_type", "artist")
      .eq("is_favorite", true)
      .order("created_at", { ascending: false })
      .order("spotify_id", { ascending: true })
      .range(start, start + pageSize - 1)
      .abortSignal(requestSignal);
  }

  let result = await readPage(page);

  assertActive(userId, requestSignal);

  if (result.error) throw result.error;
  if (result.count === null) throw new Error("INVALID_LIBRARY_RESPONSE");

  const lastPage = Math.max(1, Math.ceil(result.count / pageSize));
  const resolvedPage = Math.min(page, lastPage);

  if (resolvedPage !== page) {
    result = await readPage(resolvedPage);
    assertActive(userId, requestSignal);

    if (result.error) throw result.error;
    if (result.count === null) throw new Error("INVALID_LIBRARY_RESPONSE");
  }

  const preferences = z.array(musicPreferenceSchema).parse(result.data ?? []);

  if (
    preferences.some(
      (item) =>
        item.user_id !== userId ||
        item.entity_type !== "artist" ||
        !item.is_favorite,
    )
  ) {
    throw new Error("INVALID_LIBRARY_RESPONSE");
  }

  const ids = preferences.map((item) => item.spotify_id);

  if (new Set(ids).size !== ids.length) {
    throw new Error("INVALID_LIBRARY_RESPONSE");
  }

  if (ids.length === 0) {
    return {
      items: [],
      total: result.count,
      page: resolvedPage,
      metadataError: false,
    };
  }

  const metadata = await supabase
    .from("artist_cache")
    .select("spotify_artist_id,name,image_url,image_width,image_height")
    .in("spotify_artist_id", ids)
    .abortSignal(requestSignal);

  assertActive(userId, requestSignal);

  const artists = new Map<string, z.infer<typeof cachedArtistSchema>>();

  let metadataError = metadata.error !== null;

  if (!metadata.error) {
    for (const row of metadata.data ?? []) {
      const parsed = cachedArtistSchema.safeParse(row);

      if (!parsed.success || !ids.includes(parsed.data.spotify_artist_id)) {
        metadataError = true;
        continue;
      }

      artists.set(parsed.data.spotify_artist_id, parsed.data);
    }
  }

  if (artists.size !== ids.length) metadataError = true;

  return {
    items: ids.map((id) => {
      const artist = artists.get(id);

      return {
        id,
        name: artist?.name ?? null,
        imageUrl: artist?.image_url ?? null,
      };
    }),
    total: result.count,
    page: resolvedPage,
    metadataError,
  };
}
