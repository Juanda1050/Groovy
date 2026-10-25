import { supabase } from "@/lib/supabaseClient";
import { validateReviewLanguage } from "@/lib/reviewLanguage";
import {
  countReviewCharacters,
  normalizeReview,
  reviewMaxLength,
} from "@/lib/reviewText";
import { useAuthStore } from "@/stores/authStore";
import type {
  AlbumReviewRecord,
  SaveAlbumReviewInput,
} from "@/models/albumReview";

function assertCurrentUser(userId: string): void {
  if (useAuthStore.getState().user?.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function createSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(12_000);

  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

export async function getAlbumReview(
  userId: string,
  albumId: string,
  signal?: AbortSignal,
): Promise<AlbumReviewRecord> {
  assertCurrentUser(userId);

  const { data, error } = await supabase
    .from("user_albums")
    .select("status, review")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createSignal(signal))
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error("ALBUM_NOT_SAVED");

  if (data.status !== "pending" && data.status !== "listened") {
    throw new Error("INVALID_STATUS");
  }

  return {
    status: data.status,
    review: data.review,
  };
}

export async function saveAlbumReview({
  userId,
  albumId,
  review,
  language,
}: SaveAlbumReviewInput): Promise<AlbumReviewRecord> {
  assertCurrentUser(userId);

  const normalized = normalizeReview(review);

  if (countReviewCharacters(normalized) > reviewMaxLength) {
    throw new Error("REVIEW_TOO_LONG");
  }

  await validateReviewLanguage(normalized, language);
  assertCurrentUser(userId);

  const { data: current, error: readError } = await supabase
    .from("user_albums")
    .select("*, user_track_picks(spotify_track_id, preference)")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createSignal())
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
      ...(normalized ? { p_review: normalized } : {}),
      ...(current.rating !== null ? { p_rating: current.rating } : {}),
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
    status: "listened",
    review: saved.review,
  };
}
