import { supabase } from "@/lib/supabaseClient";
import {
  countReviewCharacters,
  normalizeReview,
  reviewMaxLength,
  validateReviewLanguage,
} from "@/lib/reviewText";
import { signOut } from "./authService";
import { saveCatalogAlbum } from "./spotifyService";
import type { CatalogRatings } from "@/models/catalog";
import type {
  AlbumWriteRequest,
  LibraryAlbum,
  SaveUserAlbumArgs,
  UserAlbumRow,
} from "@/models/library";
import type {
  GetLibraryInput,
  LibraryItem,
  LibraryPageResult,
  LibraryRow,
} from "@/models/libraryView";

const pageSize = 24;
const requestTimeout = 12_000;

function createSignal(signal?: AbortSignal): AbortSignal {
  const timeout = AbortSignal.timeout(requestTimeout);

  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

async function requireUser(userId: string): Promise<void> {
  const { data, error } = await supabase.auth.getSession();

  if (error) throw error;

  if (data.session?.user.id !== userId) {
    throw new Error("AUTH_REQUIRED");
  }
}

function validateAlbumId(albumId: string): void {
  if (!/^[A-Za-z0-9]{22}$/.test(albumId)) {
    throw new Error("INVALID_ALBUM_ID");
  }
}

function mapUserAlbum(
  row: UserAlbumRow,
  userId: string,
  albumId: string,
): LibraryAlbum {
  if (row.user_id !== userId || row.spotify_album_id !== albumId) {
    throw new Error("INVALID_ALBUM_RESPONSE");
  }

  if (row.status !== "pending" && row.status !== "listened") {
    throw new Error("INVALID_STATUS");
  }

  return { ...row, status: row.status };
}

function mapLibraryItem(row: LibraryRow): LibraryItem {
  if (row.status !== "pending" && row.status !== "listened") {
    throw new Error("INVALID_STATUS");
  }

  return {
    id: row.id,
    spotifyAlbumId: row.spotify_album_id,
    status: row.status,
    rating: row.rating ?? null,
    hasReview: row.has_review,
    title: row.album_name || null,
    coverUrl: row.cover_url || null,
    artists: row.artist_names ?? [],
    metadataAvailable: row.metadata_available,
  };
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

async function persistAlbum(
  userId: string,
  albumId: string,
  args: SaveUserAlbumArgs,
): Promise<LibraryAlbum> {
  await requireUser(userId);

  const { data, error } = await supabase
    .rpc("save_user_album", args)
    .abortSignal(createSignal());

  if (error) throw error;
  if (!data) throw new Error("INVALID_SAVE_RESPONSE");

  const saved = mapUserAlbum(data, userId, albumId);

  if (saved.status !== args.p_status) {
    throw new Error("INVALID_SAVE_RESPONSE");
  }

  return saved;
}

export async function getLibrary({
  filter,
  cursor,
  signal,
}: GetLibraryInput): Promise<LibraryPageResult> {
  const { data, error } = await supabase
    .rpc("get_my_library", {
      p_filter: filter,
      p_limit: pageSize,
      ...(cursor
        ? {
            p_before_created_at: cursor.createdAt,
            p_before_id: cursor.id,
          }
        : {}),
    })
    .abortSignal(createSignal(signal));

  if (error) {
    if (error.code === "PT401") await signOut();

    throw error;
  }

  const rows = data ?? [];
  const visibleRows = rows.slice(0, pageSize);
  const lastRow = visibleRows.at(-1);

  return {
    items: visibleRows.map(mapLibraryItem),
    nextCursor:
      rows.length > pageSize && lastRow
        ? {
            createdAt: lastRow.created_at,
            id: lastRow.id,
          }
        : null,
  };
}

export async function getUserAlbum(
  userId: string,
  albumId: string,
  signal?: AbortSignal,
): Promise<LibraryAlbum | null> {
  validateAlbumId(albumId);
  await requireUser(userId);

  const { data, error } = await supabase
    .from("user_albums")
    .select("*")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createSignal(signal))
    .maybeSingle();

  if (error) throw error;

  return data ? mapUserAlbum(data, userId, albumId) : null;
}

export async function getCatalogRatings(
  userId: string,
  albumIds: readonly string[],
  signal: AbortSignal,
): Promise<CatalogRatings> {
  await requireUser(userId);

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
    .abortSignal(createSignal(signal));

  if (error) throw error;

  for (const album of data ?? []) {
    ratings[album.spotify_album_id] = album.rating;
  }

  return ratings;
}

export async function saveUserAlbum(
  request: AlbumWriteRequest,
): Promise<LibraryAlbum> {
  const { userId, albumId } = request;

  validateAlbumId(albumId);
  await requireUser(userId);

  if (request.action === "status") {
    if (request.isNew) {
      await saveCatalogAlbum({
        albumId,
        status: request.status,
      });

      const saved = await getUserAlbum(userId, albumId);

      if (!saved) throw new Error("INVALID_SAVE_RESPONSE");

      return saved;
    }

    const current = await getUserAlbum(userId, albumId);

    if (!current) throw new Error("ALBUM_NOT_SAVED");

    // Repetir el mismo estado no debe borrar datos de escucha.
    if (current.status === request.status) return current;

    return persistAlbum(userId, albumId, {
      p_spotify_album_id: albumId,
      p_status: request.status,
      p_favorite_track_ids: [],
      p_least_favorite_track_ids: [],
    });
  }

  let normalizedReview: string | undefined;

  if (request.action === "rating") {
    validateRating(request.rating);
  } else {
    normalizedReview = normalizeReview(request.review);

    if (countReviewCharacters(normalizedReview) > reviewMaxLength) {
      throw new Error("REVIEW_TOO_LONG");
    }

    await validateReviewLanguage(normalizedReview, request.language);
  }

  await requireUser(userId);

  const { data: current, error } = await supabase
    .from("user_albums")
    .select("*, user_track_picks(spotify_track_id, preference)")
    .eq("user_id", userId)
    .eq("spotify_album_id", albumId)
    .abortSignal(createSignal())
    .maybeSingle();

  if (error) throw error;
  if (!current) throw new Error("ALBUM_NOT_SAVED");

  const album = mapUserAlbum(current, userId, albumId);

  if (album.status !== "listened") {
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

  const rating = request.action === "rating" ? request.rating : album.rating;

  const review =
    request.action === "review" ? normalizedReview || null : album.review;

  return persistAlbum(userId, albumId, {
    p_spotify_album_id: albumId,
    p_status: "listened",
    p_favorite_track_ids: favoriteTrackIds,
    p_least_favorite_track_ids: leastFavoriteTrackIds,
    ...(rating !== null ? { p_rating: rating } : {}),
    ...(review !== null ? { p_review: review } : {}),
    ...(album.listened_at !== null ? { p_listened_at: album.listened_at } : {}),
  });
}
