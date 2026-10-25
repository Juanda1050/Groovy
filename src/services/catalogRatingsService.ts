import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/stores/authStore";
import type { CatalogRatings } from "@/models/catalog";

export async function getCatalogRatings(
  userId: string,
  albumIds: readonly string[],
  signal: AbortSignal,
): Promise<CatalogRatings> {
  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }

  const ids = [...new Set(albumIds)];

  const ratings: CatalogRatings = Object.fromEntries(
    ids.map((id) => [id, null]),
  );

  if (ids.length === 0) return ratings;

  const { data, error } = await supabase
    .from("user_albums")
    .select("spotify_album_id, rating")
    .eq("user_id", userId)
    .eq("status", "listened")
    .in("spotify_album_id", ids)
    .abortSignal(AbortSignal.any([signal, AbortSignal.timeout(12_000)]));

  if (error) throw error;

  for (const album of data ?? []) {
    ratings[album.spotify_album_id] = album.rating;
  }

  return ratings;
}
