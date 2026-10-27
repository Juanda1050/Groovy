import { queryClient } from "@/app/queryClient";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { albumDetailOptions } from "@/features/catalog/lib/albumQueries";
import { catalogAlbumSchema } from "@/features/catalog/lib/catalogSchemas";
import type { FeedAlbum } from "@/models/library";
import { supabase } from "@/shared/lib/supabaseClient";

export async function getAlbumMetadata(
  userId: string,
  albumIds: readonly string[],
  signal: AbortSignal,
): Promise<FeedAlbum[]> {
  const ids = [...new Set(albumIds)];

  function assertActive(): void {
    signal.throwIfAborted();

    if (useAuthStore.getState().user?.id !== userId) {
      throw new Error("AUTH_REQUIRED");
    }
  }

  assertActive();

  if (!ids.length) return [];

  if (ids.some((id) => !/^[A-Za-z0-9]{22}$/.test(id))) {
    throw new Error("INVALID_ALBUM_ID");
  }

  const { data, error } = await supabase
    .from("album_cache")
    .select("spotify_album_id, name, cover_url, artists")
    .in("spotify_album_id", ids)
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(12_000)]));

  if (error) throw error;

  assertActive();

  const albums = new Map<string, FeedAlbum>();

  for (const row of data ?? []) {
    const artists = catalogAlbumSchema.shape.artists.safeParse(row.artists);

    if (!row.name.trim() || !artists.success) continue;

    albums.set(row.spotify_album_id, {
      id: row.spotify_album_id,
      name: row.name,
      coverUrl: row.cover_url,
      artists: artists.data.map((artist) => artist.name),
    });
  }

  const missing = ids.filter((id) => !albums.has(id));

  let next = 0;
  let failure: unknown;
  let failed = false;

  async function recover(): Promise<void> {
    while (!failed && next < missing.length) {
      const id = missing[next++];

      if (!id) return;

      try {
        assertActive();

        const detail = await queryClient.fetchQuery({
          ...albumDetailOptions(userId, id),
          retry: false,
        });

        assertActive();

        if (detail.album.id !== id) {
          throw new Error("INVALID_ALBUM_RESPONSE");
        }

        albums.set(id, {
          id,
          name: detail.album.name,
          coverUrl: detail.album.coverUrl,
          artists: detail.album.artists.map((artist) => artist.name),
        });
      } catch (error: unknown) {
        failed = true;
        failure = error;
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(2, missing.length) }, () => recover()),
  );

  assertActive();

  if (failed) throw failure;

  return ids.map((id) => {
    const album = albums.get(id);

    if (!album) {
      throw new Error("ALBUM_METADATA_UNAVAILABLE");
    }

    return album;
  });
}
