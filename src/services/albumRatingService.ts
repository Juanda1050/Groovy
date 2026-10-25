import { supabase } from "@/lib/supabaseClient";
import { useAuthStore } from "@/stores/authStore";
import type {
  AlbumRatingRecord,
  SaveAlbumRatingInput,
} from "@/models/albumRating";

function assertCurrentUser(userId: string): void {
  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function validateRating(rating: number | null): void {
  if (
    rating !== null &&
    (!Number.isFinite(rating) ||
      rating < 1 ||
      rating > 10 ||
      !Number.isInteger(rating * 2))
  ) {
    throw new Error("INVALID_RATING");
  }
}

function createReadSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(12_000);

  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function getAlbumRating(
  userId: string,
  albumId: string,
  signal?: AbortSignal,
): Promise<AlbumRatingRecord> {
  assertCurrentUser(userId);

  const { data, error } = await supabase
    .from("user_albums")
    .select("rating, status")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createReadSignal(signal))
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("ALBUM_NOT_SAVED");

  if (data.status !== "pending" && data.status !== "listened") {
    throw new Error("INVALID_STATUS");
  }

  return {
    rating: data.rating,
    status: data.status,
  };
}

export async function saveAlbumRating({
  userId,
  albumId,
  rating,
}: SaveAlbumRatingInput): Promise<AlbumRatingRecord> {
  assertCurrentUser(userId);
  validateRating(rating);

  const { data: current, error: readError } = await supabase
    .from("user_albums")
    .select("*, user_track_picks(spotify_track_id, preference)")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createReadSignal())
    .maybeSingle();

  if (readError) throw readError;
  if (!current) throw new Error("ALBUM_NOT_SAVED");

  if (current.status !== "listened") {
    throw new Error("ALBUM_NOT_LISTENED");
  }

  const favoriteTrackIds: string[] = [];
  const leastFavoriteTrackIds: string[] = [];

  for (const pick of current.user_track_picks) {
    if (pick.preference === "favorite") {
      favoriteTrackIds.push(pick.spotify_track_id);
    } else if (pick.preference === "least_favorite") {
      leastFavoriteTrackIds.push(pick.spotify_track_id);
    } else {
      throw new Error("INVALID_TRACK_SELECTION");
    }
  }

  assertCurrentUser(userId);

  const { data: saved, error: saveError } = await supabase
    .rpc("save_user_album", {
      p_spotify_album_id: albumId,
      p_status: "listened",
      p_favorite_track_ids: favoriteTrackIds,
      p_least_favorite_track_ids: leastFavoriteTrackIds,
      ...(rating !== null ? { p_rating: rating } : {}),
      ...(current.review !== null ? { p_review: current.review } : {}),
      ...(current.listened_at !== null
        ? { p_listened_at: current.listened_at }
        : {}),
    })
    .abortSignal(AbortSignal.timeout(12_000));

  if (saveError) throw saveError;

  if (
    !saved ||
    saved.user_id !== userId ||
    saved.spotify_album_id !== albumId ||
    saved.status !== "listened"
  ) {
    throw new Error("INVALID_SAVE_RESPONSE");
  }

  return {
    rating: saved.rating,
    status: "listened",
  };
}
