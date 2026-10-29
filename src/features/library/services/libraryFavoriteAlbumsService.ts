import { z } from "zod";

import { useAuthStore } from "@/features/auth/stores/authStore";
import { getAlbumMetadata } from "@/features/catalog/services/albumMetadataService";
import {
  createSignal,
  requireUser,
} from "@/features/library/services/libraryService";
import { musicPreferenceSchema } from "@/features/preferences/lib/musicPreferenceSchemas";
import type { GetLibraryInput, LibraryPageResult } from "@/models/libraryView";
import { supabase } from "@/shared/lib/supabaseClient";

function assertActive(userId: string, signal: AbortSignal): void {
  signal.throwIfAborted();

  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

export async function getFavoriteLibraryAlbums({
  userId,
  page,
  pageSize,
  signal,
}: GetLibraryInput): Promise<LibraryPageResult> {
  if (!Number.isSafeInteger(page) || page < 1 || pageSize !== 10) {
    throw new Error("INVALID_PAGINATION");
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
      .eq("entity_type", "album")
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
  const currentPage = Math.min(page, lastPage);

  if (currentPage !== page) {
    result = await readPage(currentPage);

    assertActive(userId, requestSignal);

    if (result.error) throw result.error;
    if (result.count === null) throw new Error("INVALID_LIBRARY_RESPONSE");
  }

  const preferences = z.array(musicPreferenceSchema).parse(result.data ?? []);

  if (
    preferences.some(
      (item) =>
        item.user_id !== userId ||
        item.entity_type !== "album" ||
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
      page: currentPage,
      pageSize,
    };
  }

  const [saved, metadata] = await Promise.all([
    supabase
      .from("user_albums")
      .select("*")
      .eq("user_id", userId)
      .in("spotify_album_id", ids)
      .abortSignal(requestSignal),
    getAlbumMetadata(userId, ids, requestSignal),
  ]);

  assertActive(userId, requestSignal);

  if (saved.error) throw saved.error;

  const savedAlbums = new Map(
    (saved.data ?? []).map((album) => [album.spotify_album_id, album]),
  );
  const cachedAlbums = new Map(metadata.map((album) => [album.id, album]));

  return {
    items: ids.map((id) => {
      const savedAlbum = savedAlbums.get(id);
      const cached = cachedAlbums.get(id);
      const status = savedAlbum?.status ?? null;

      if (
        (savedAlbum && savedAlbum.user_id !== userId) ||
        (status !== null && status !== "pending" && status !== "listened")
      ) {
        throw new Error("INVALID_LIBRARY_RESPONSE");
      }

      return {
        id: savedAlbum?.id ?? `favorite:${id}`,
        spotifyAlbumId: id,
        status,
        rating: savedAlbum?.rating ?? null,
        hasReview: Boolean(savedAlbum?.review?.trim()),
        title: cached?.name ?? null,
        coverUrl: cached?.coverUrl ?? null,
        artists: cached?.artists ?? [],
        metadataAvailable: Boolean(cached),
      };
    }),
    total: result.count,
    page: currentPage,
    pageSize,
  };
}
